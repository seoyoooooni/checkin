import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type CheckInCode, type CheckInResult } from '../../api';
import { getDeviceId } from '../../api/storage';
import { CODE_LENGTH } from '../../audio/protocol';
import { ReceiverError, UltrasonicReceiver } from '../../audio/receiver';
import { IconAlert, IconCheck, IconChevron, IconX } from '../../components/icons';
import { Hero, Pulse, ResultIcon, SignalBars } from './ListenUi';
import { PortalLayout } from '../../components/PortalLayout';
import './student.css';

const LISTEN_TIMEOUT_MS = 30_000;
const HINT_AFTER_MS = 12_000;

type Phase = 'ready' | 'listening' | 'submitting' | 'success' | 'already' | 'fail' | 'denied' | 'insecure' | 'unsupported';
type FailCode = CheckInCode | 'TIMEOUT' | 'NETWORK';

const RETRYABLE: CheckInCode[] = ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'NOT_ENROLLED'];

const FAIL_TEXT: Record<FailCode, { title: string; desc: string }> = {
  TIMEOUT: {
    title: '출석 신호를 찾지 못했어요',
    desc: '교수님이 신호를 보내고 있는지 확인하고,\n앞쪽 자리에서 다시 들어보세요.',
  },
  TOKEN_EXPIRED: {
    title: '신호가 만료됐어요',
    desc: '신호를 받는 데 시간이 오래 걸렸어요.\n다시 들어볼게요.',
  },
  INVALID_TOKEN: {
    title: '신호를 제대로 받지 못했어요',
    desc: '주변이 시끄러우면 잘못 들릴 수 있어요.\n교수님 쪽으로 조금 가까이 가서 다시 시도해보세요.',
  },
  NOT_ENROLLED: {
    title: '수강 중인 강의가 아니에요',
    desc: '옆 강의실 신호를 받았을 수 있어요.\n내 강의실에서 다시 들어보세요.',
  },
  SESSION_CLOSED: {
    title: '출석이 이미 마감됐어요',
    desc: '출석 처리가 필요하면 교수님께 말씀드려 주세요.',
  },
  UNREGISTERED_DEVICE: {
    title: '등록되지 않은 기기예요',
    desc: '처음 등록한 기기로 출석해주세요.\n기기를 바꿨다면 기기 변경을 요청해주세요.',
  },
  NETWORK: {
    title: '서버에 연결하지 못했어요',
    desc: '인터넷 연결을 확인하고 다시 시도해주세요.',
  },
  PRESENT: { title: '', desc: '' },
  LATE: { title: '', desc: '' },
  DUPLICATE: { title: '', desc: '' },
};

const timeText = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

export function CheckInPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('ready');
  const [progress, setProgress] = useState(-1);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [failCode, setFailCode] = useState<FailCode>('TIMEOUT');

  const rxRef = useRef<UltrasonicReceiver | null>(null);
  const tried = useRef(new Set<string>());
  const busy = useRef(false);
  const lastError = useRef<FailCode | null>(null);
  const startedAt = useRef(0);
  const timers = useRef<number[]>([]);

  const stopListening = useCallback(() => {
    rxRef.current?.stop();
    rxRef.current = null;
    timers.current.forEach(clearInterval);
    timers.current = [];
  }, []);

  useEffect(() => stopListening, [stopListening]);

  const finishFail = useCallback(
    (code: FailCode) => {
      stopListening();
      setFailCode(code);
      setPhase('fail');
    },
    [stopListening],
  );

  const submit = useCallback(
    async (code: string) => {
      if (busy.current || tried.current.has(code)) return;
      tried.current.add(code);
      busy.current = true;
      setPhase('submitting');
      try {
        const res = await api.checkIn(code, getDeviceId());
        if (res.code === 'PRESENT' || res.code === 'LATE') {
          stopListening();
          setResult(res);
          setPhase('success');
        } else if (res.code === 'DUPLICATE') {
          stopListening();
          setResult(res);
          setPhase('already');
        } else if (RETRYABLE.includes(res.code)) {
          lastError.current = res.code;
          setProgress(-1);
          setPhase('listening');
        } else {
          finishFail(res.code);
        }
      } catch {
        finishFail('NETWORK');
      } finally {
        busy.current = false;
      }
    },
    [finishFail, stopListening],
  );

  const startListening = async () => {
    tried.current.clear();
    lastError.current = null;
    setProgress(-1);
    setLevel(0);
    setElapsed(0);

    const rx = new UltrasonicReceiver({
      onCode: (c) => void submit(c),
      onLevel: setLevel,
      onProgress: setProgress,
    });
    try {
      await rx.start();
    } catch (e) {
      const code = e instanceof ReceiverError ? e.code : 'unknown';
      if (code === 'denied') setPhase('denied');
      else if (code === 'insecure') setPhase('insecure');
      else setPhase('unsupported');
      return;
    }
    rxRef.current = rx;
    startedAt.current = Date.now();
    setPhase('listening');

    timers.current.push(
      window.setInterval(() => {
        const t = Date.now() - startedAt.current;
        setElapsed(t);
        if (t >= LISTEN_TIMEOUT_MS && !busy.current) finishFail(lastError.current ?? 'TIMEOUT');
      }, 250),
    );
  };

  const cancel = () => {
    stopListening();
    setPhase('ready');
  };

  return (
    <PortalLayout>
      <nav className="breadcrumb">
        <Link to="/student">내 수강 과목</Link>
        <IconChevron size={14} />
        <span>출석하기</span>
      </nav>

      <section className="card checkin-card">
        {phase === 'ready' && (
          <Hero visual={<Pulse on={false} />} title="출석 신호를 들어볼게요" desc="마이크 사용을 허용해주세요" />
        )}

        {(phase === 'listening' || phase === 'submitting') && (
          <Hero
            visual={<Pulse on />}
            title={phase === 'submitting' ? '출석을 확인하고 있어요' : '신호를 듣고 있어요'}
            desc={
              elapsed > HINT_AFTER_MS && phase === 'listening'
                ? '잘 안 들리나요?\n교수님 쪽으로 조금 가까이 가보세요.'
                : '교수님 노트북 소리가 들리는 곳에서\n잠깐 기다려주세요.'
            }
          >
            <div className="listen-panel">
              <div className="listen-row">
                <span>신호 세기</span>
                <SignalBars snr={level} />
              </div>
              <div className="listen-row">
                <span>받은 신호</span>
                <div className="digits" aria-label={`${Math.max(0, progress)}/${CODE_LENGTH}`}>
                  {Array.from({ length: CODE_LENGTH }, (_, i) => (
                    <i key={i} className={i < progress ? 'on' : ''} />
                  ))}
                </div>
              </div>
              <div className="listen-time">
                <span style={{ width: `${Math.min(100, (elapsed / LISTEN_TIMEOUT_MS) * 100)}%` }} />
              </div>
            </div>
          </Hero>
        )}

        {phase === 'success' && result && (
          <Hero
            visual={<ResultIcon tone={result.code === 'LATE' ? 'orange' : 'green'} icon={<IconCheck size={44} />} />}
            title={result.code === 'LATE' ? '지각으로 출석했어요' : '출석했어요'}
            desc={result.code === 'LATE' ? '지각 기준 시간이 지나서 지각으로 기록됐어요.' : '오늘 수업도 화이팅이에요!'}
          >
            <ResultCard result={result} />
          </Hero>
        )}

        {phase === 'already' && result && (
          <Hero
            visual={<ResultIcon tone="blue" icon={<IconCheck size={44} />} />}
            title="이미 출석했어요"
            desc="오늘 이 수업은 출석이 끝났어요."
          >
            <ResultCard result={result} />
          </Hero>
        )}

        {phase === 'fail' && (
          <Hero
            visual={<ResultIcon tone="grey" icon={<IconAlert size={44} />} />}
            title={FAIL_TEXT[failCode].title}
            desc={FAIL_TEXT[failCode].desc}
          >
            <ManualHint />
          </Hero>
        )}

        {phase === 'denied' && (
          <Hero
            visual={<ResultIcon tone="red" icon={<IconX size={40} />} />}
            title={'마이크 권한이\n필요해요'}
            desc="권한을 켠 뒤 다시 시도해주세요."
          >
            <div className="perm-steps">
              <div>
                <b>아이폰 (Safari)</b>
                <p>주소창 왼쪽 ‘가가’ → 웹사이트 설정 → 마이크 → 허용</p>
              </div>
              <div>
                <b>안드로이드 (Chrome)</b>
                <p>주소창 왼쪽 자물쇠 → 권한 → 마이크 → 허용</p>
              </div>
              <div>
                <b>노트북 (Chrome, Edge)</b>
                <p>주소창 왼쪽 사이트 정보 아이콘 → 마이크 → 허용</p>
              </div>
              <div>
                <b>맥 (Safari)</b>
                <p>Safari 메뉴 → 설정 → 웹사이트 → 마이크 → 허용</p>
              </div>
            </div>
            <ManualHint />
          </Hero>
        )}

        {phase === 'insecure' && (
          <Hero
            visual={<ResultIcon tone="grey" icon={<IconAlert size={44} />} />}
            title={'보안 연결에서만\n마이크를 쓸 수 있어요'}
            desc={'https 주소로 접속해주세요.\n개발 중이라면 npm run dev:https 로 띄우면 돼요.'}
          />
        )}

        {phase === 'unsupported' && (
          <Hero
            visual={<ResultIcon tone="grey" icon={<IconAlert size={44} />} />}
            title={'이 기기는 출석 신호를\n받을 수 없어요'}
            desc="마이크가 없거나 높은 소리를 받지 못하는 기기예요."
          >
            <ManualHint />
          </Hero>
        )}
        <div className="checkin-actions">
          {phase === 'ready' && (
            <button className="btn btn-primary btn-lg btn-block" onClick={startListening}>
              듣기 시작
            </button>
          )}
          {(phase === 'listening' || phase === 'submitting') && (
            <button className="btn btn-grey btn-lg btn-block" onClick={cancel}>
              그만 듣기
            </button>
          )}
          {(phase === 'success' || phase === 'already') && (
            <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/student')}>
              확인
            </button>
          )}
          {(phase === 'fail' || phase === 'denied' || phase === 'unsupported') && (
            <>
              {failCode !== 'SESSION_CLOSED' && failCode !== 'UNREGISTERED_DEVICE' && phase === 'fail' ? (
                <button className="btn btn-primary btn-lg btn-block" onClick={startListening}>
                  다시 듣기
                </button>
              ) : phase === 'denied' ? (
                <button className="btn btn-primary btn-lg btn-block" onClick={startListening}>
                  다시 시도
                </button>
              ) : null}
              <button className="btn btn-grey btn-lg btn-block" onClick={() => navigate('/student')}>
                홈으로
              </button>
            </>
          )}
        </div>
      </section>
    </PortalLayout>
  );
}

function ResultCard({ result }: { result: CheckInResult }) {
  return (
    <dl className="result-card">
      {result.courseName && (
        <div>
          <dt>과목</dt>
          <dd>{result.courseName}</dd>
        </div>
      )}
      {result.submittedAt && (
        <div>
          <dt>출석 시각</dt>
          <dd className="num">{timeText(result.submittedAt)}</dd>
        </div>
      )}
    </dl>
  );
}

function ManualHint() {
  return (
    <div className="info-box">
      <IconAlert size={20} />
      <div>
        계속 안 되면 <b>교수님께 수동 출석</b>을 요청해주세요. 교수님 화면에서 바로 출석 처리할 수 있어요.
      </div>
    </div>
  );
}

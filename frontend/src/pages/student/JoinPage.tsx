import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Course } from '../../api';
import { CODE_LENGTH } from '../../audio/protocol';
import { ReceiverError, UltrasonicReceiver } from '../../audio/receiver';
import { IconAlert, IconBook, IconCheck, IconChevron, IconX } from '../../components/icons';
import { PortalLayout } from '../../components/PortalLayout';
import { Hero, Pulse, ResultIcon, SignalBars } from './ListenUi';
import './student.css';

const LISTEN_TIMEOUT_MS = 30_000;
const HINT_AFTER_MS = 12_000;

type Phase =
  | 'ready'
  | 'listening'
  | 'found'
  | 'joining'
  | 'joined'
  | 'already'
  | 'fail'
  | 'denied'
  | 'insecure'
  | 'unsupported';

export function JoinPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('ready');
  const [progress, setProgress] = useState(-1);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [course, setCourse] = useState<Course | null>(null);
  const [ticket, setTicket] = useState('');
  const [failText, setFailText] = useState({ title: '', desc: '' });

  const rxRef = useRef<UltrasonicReceiver | null>(null);
  const tried = useRef(new Set<string>());
  const busy = useRef(false);
  const startedAt = useRef(0);
  const timers = useRef<number[]>([]);

  const stopListening = useCallback(() => {
    rxRef.current?.stop();
    rxRef.current = null;
    timers.current.forEach(clearInterval);
    timers.current = [];
  }, []);

  useEffect(() => stopListening, [stopListening]);

  const fail = useCallback(
    (title: string, desc: string) => {
      stopListening();
      setFailText({ title, desc });
      setPhase('fail');
    },
    [stopListening],
  );

  const check = useCallback(
    async (code: string) => {
      if (busy.current || tried.current.has(code)) return;
      tried.current.add(code);
      busy.current = true;
      try {
        const res = await api.previewJoin(code);
        if (res.code === 'OK' && res.course && res.ticket) {
          stopListening();
          setCourse(res.course);
          setTicket(res.ticket);
          setPhase('found');
        } else if (res.code === 'ALREADY_ENROLLED' && res.course) {
          stopListening();
          setCourse(res.course);
          setPhase('already');
        } else {
          setProgress(-1);
        }
      } catch (e) {
        fail('서버에 연결하지 못했어요', e instanceof Error ? e.message : '인터넷 연결을 확인해주세요.');
      } finally {
        busy.current = false;
      }
    },
    [fail, stopListening],
  );

  const startListening = async () => {
    tried.current.clear();
    setProgress(-1);
    setLevel(0);
    setElapsed(0);
    setCourse(null);

    const rx = new UltrasonicReceiver({
      onCode: (c) => void check(c),
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
        if (t >= LISTEN_TIMEOUT_MS && !busy.current) {
          fail('모집 신호를 찾지 못했어요', '교수님이 모집 중인지 확인하고\n다시 들어보세요.');
        }
      }, 250),
    );
  };

  const join = async () => {
    setPhase('joining');
    try {
      setCourse(await api.joinCourse(ticket));
      setPhase('joined');
    } catch (e) {
      fail('참여하지 못했어요', e instanceof Error ? e.message : '다시 시도해주세요.');
    }
  };

  const cancel = () => {
    stopListening();
    setPhase('ready');
  };

  const courseTitle = course ? `${course.name} ${course.section}반` : '';

  return (
    <PortalLayout>
      <nav className="breadcrumb">
        <Link to="/student">내 수강 과목</Link>
        <IconChevron size={14} />
        <span>강의 참여</span>
      </nav>

      <section className="card checkin-card">
        {phase === 'ready' && (
          <Hero visual={<Pulse on={false} />} title="강의 모집 신호를 들어볼게요" desc="마이크 사용을 허용해주세요" />
        )}

        {phase === 'listening' && (
          <Hero
            visual={<Pulse on />}
            title="신호를 듣고 있어요"
            desc={
              elapsed > HINT_AFTER_MS
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

        {(phase === 'found' || phase === 'joining') && course && (
          <Hero
            visual={<ResultIcon tone="blue" icon={<IconBook size={40} />} />}
            title={courseTitle}
            desc="이 강의에 참여할까요?"
          >
            <CourseInfo course={course} />
          </Hero>
        )}

        {phase === 'joined' && course && (
          <Hero
            visual={<ResultIcon tone="green" icon={<IconCheck size={44} />} />}
            title="참여했어요"
            desc={`${courseTitle} 수강생으로 등록됐어요.`}
          />
        )}

        {phase === 'already' && course && (
          <Hero
            visual={<ResultIcon tone="blue" icon={<IconCheck size={44} />} />}
            title="이미 참여한 강의예요"
            desc={courseTitle}
          />
        )}

        {phase === 'fail' && (
          <Hero
            visual={<ResultIcon tone="grey" icon={<IconAlert size={44} />} />}
            title={failText.title}
            desc={failText.desc}
          />
        )}

        {phase === 'denied' && (
          <Hero
            visual={<ResultIcon tone="red" icon={<IconX size={40} />} />}
            title="마이크 권한이 필요해요"
            desc="브라우저 설정에서 마이크를 허용한 뒤 다시 시도해주세요."
          />
        )}

        {phase === 'insecure' && (
          <Hero
            visual={<ResultIcon tone="grey" icon={<IconAlert size={44} />} />}
            title={'보안 연결에서만\n마이크를 쓸 수 있어요'}
            desc="https 주소로 접속해주세요."
          />
        )}

        {phase === 'unsupported' && (
          <Hero
            visual={<ResultIcon tone="grey" icon={<IconAlert size={44} />} />}
            title={'이 기기는 신호를\n받을 수 없어요'}
            desc="교수님께 학번으로 추가해달라고 요청해주세요."
          />
        )}

        <div className="checkin-actions">
          {phase === 'ready' && (
            <button className="btn btn-primary btn-lg btn-block" onClick={startListening}>
              듣기 시작
            </button>
          )}
          {phase === 'listening' && (
            <button className="btn btn-grey btn-lg btn-block" onClick={cancel}>
              그만 듣기
            </button>
          )}
          {(phase === 'found' || phase === 'joining') && (
            <>
              <button className="btn btn-primary btn-lg btn-block" onClick={join} disabled={phase === 'joining'}>
                {phase === 'joining' ? '참여하는 중' : '참여하기'}
              </button>
              <button className="btn btn-grey btn-lg btn-block" onClick={startListening} disabled={phase === 'joining'}>
                다시 듣기
              </button>
            </>
          )}
          {(phase === 'joined' || phase === 'already') && (
            <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/student')}>
              확인
            </button>
          )}
          {(phase === 'fail' || phase === 'denied' || phase === 'unsupported') && (
            <>
              {phase !== 'unsupported' && (
                <button className="btn btn-primary btn-lg btn-block" onClick={startListening}>
                  다시 듣기
                </button>
              )}
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

function CourseInfo({ course }: { course: Course }) {
  const rows = [
    ['교수', course.professorName],
    ['시간', course.schedule],
    ['강의실', course.room],
    ['학기', course.semester],
  ].filter(([, v]) => v);
  return (
    <dl className="result-card">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

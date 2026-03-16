import React, { useState, useEffect } from 'react';
import { Map, Activity, Edit3, Info, FileText, Rocket, CheckCircle2, Cloud, CloudOff, Loader2, Share2, Check } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase の初期設定（クラウド保存用）
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// 初期データ：提供されたテキストと画像のグラフを統合
const initialData = [
  {
    id: 'before',
    title: '出発前',
    graphLabel: '↑ 期待',
    emotionScore: 8,
    action: 'デスクでふと「喫煙所行こう」と思う（なんとなく／一区切り／退屈／期待）',
    motivation: '目的は"なんとなく"が最多。次に休憩・息抜き・タスク一区切り。',
    emotionText: '期待（7〜9）→「いたら楽しいな」程度。落ち着きたい欲、少しのワクワク。',
    time: '瞬間決断〜数分の準備',
    trigger: '業務の一区切り、会議の合間、上司が外出しそうな時間（会話機会期待）。',
    hint: '出発前の"軽い期待"を創る仕掛け（例：10分の"一服"カウントダウン通知や誘いポップアップ）で非喫煙者も出やすくなる。'
  },
  {
    id: 'enter',
    title: '入室',
    graphLabel: '',
    emotionScore: 1,
    action: '入口を入る。先に知り合いがいると挨拶→会話が流れる。',
    motivation: '「誰かいれば話したい」「一人ならさっさと吸いたい」',
    emotionText: '期待 7–9 → 即時の評価（知り合いがいるか）',
    time: '0–10秒で判断',
    trigger: '入口一つ、灰皿位置、椅子まわりの"輪"、既存の会話の密度',
    hint: '入口近くに「今日の問い」カードや小さな視覚フックを置いておくと、知らない人同士の会話のきっかけになる。'
  },
  {
    id: 'first_contact',
    title: '初対面',
    graphLabel: '',
    emotionScore: 1,
    action: '知り合いと目が合ったら挨拶→知り合いが他人を紹介する流れで「初めまして」へ。',
    motivation: '紹介の流れに乗るだけ。自分から話しかけることは少なく、声は向こうから来るパターン多し。',
    emotionText: '緊張ほぼ0、"様子見"な安心感（3〜5）。',
    time: '30秒〜2分で会話スタート',
    trigger: '「どこの部署ですか？」「いま何やってるんですか？」\n（珍しいデバイスを見つけたら）「それ何？どんな味？」',
    hint: '紹介がスムーズになる"繋ぎ役"を作る（例えばその日ランダムで選ばれた"ホスト"名札やバッジ）で、輪に入るハードルを下げられる。'
  },
  {
    id: 'conversation',
    title: '会話',
    graphLabel: '笑い・共感',
    emotionScore: 8,
    action: 'ライトな自己／相手の紹介→共通項を探る（人→仕事→趣味→人生）',
    motivation: '雑談で安心できるか確認。あなたは自己開示を心がける（話を割らない／聞き手優先→自己開示）。',
    emotionText: '0–30秒：様子見（無）\n30s–2min：薄い好奇（4–6）\n「笑い」が生まれる瞬間：一気に高揚（8–9）',
    time: '0–3分',
    trigger: '共通の知人、趣味、仕事の悩みなど',
    hint: '話題のきっかけとなるような共通のポスターや、社内のニュースなどが掲示されていると良い。'
  },
  {
    id: 'turning_point',
    title: '転機',
    graphLabel: '',
    emotionScore: 2,
    action: 'タスクへの意識の戻り、またはタバコを吸い終わるタイミング。',
    motivation: '「そろそろ戻らなきゃ」「次の予定がある」',
    emotionText: '会話のピークが過ぎ、徐々に仕事モードへ切り替わる。',
    time: '3〜5分',
    trigger: '時計を見る、タバコの火を消す動作、誰かの退出。',
    hint: '心地よく退出できる「締め」の言葉や儀式（例：「じゃあ、また後で」）が言いやすい空気作り。'
  },
  {
    id: 'continuation',
    title: '継続',
    graphLabel: '再遭遇で安定',
    emotionScore: 5,
    action: '自席へ戻り、業務を再開する。',
    motivation: 'リフレッシュ完了。次のタスクへの集中。',
    emotionText: '適度な満足感と、次回また会った時の安心感。',
    time: '退出後',
    trigger: '自席に座る、PCを開く。',
    hint: 'この時に得た情報やアイデアをすぐにメモ・共有できる仕組み（Slackの雑談チャンネルなど）との連携。'
  }
];

// 汎用入力フィールドコンポーネント
const Field = ({ label, value, onChange, type = "text", placeholder = "", rows = 2, highlight = false }) => (
  <div className="flex flex-col gap-1.5 mb-4">
    <label className={`block text-xs font-bold ${highlight ? 'text-indigo-600' : 'text-slate-600'}`}>
      {label}
    </label>
    {type === "textarea" ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full text-sm border border-slate-200 bg-slate-50/50 hover:bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y leading-relaxed text-slate-700"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-slate-200 bg-slate-50/50 hover:bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-700"
      />
    )}
  </div>
);

// グラフコンポーネント
const JourneyGraph = ({ phases }) => {
  const width = 1000;
  const height = 300;
  const paddingX = 80;
  const paddingY = 60;

  const points = phases.map((phase, i) => {
    const x = paddingX + (i * (width - 2 * paddingX) / (phases.length - 1));
    const y = height - paddingY - (phase.emotionScore / 10) * (height - 2 * paddingY);
    return { x, y, phase };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="w-full overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex items-center gap-2 mb-2 px-4 text-slate-700 font-semibold">
        <Activity size={20} className="text-indigo-500" />
        <h3>感情曲線マップ</h3>
      </div>
      <p className="text-xs text-slate-500 px-4 mb-4">
        下部のカードの「感情スコア」スライダーを動かすと、このグラフが連動して変化します。
      </p>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[800px] drop-shadow-sm font-sans">
        {[0, 2, 4, 6, 8, 10].map(score => {
           const y = height - paddingY - (score / 10) * (height - 2 * paddingY);
           return (
             <g key={score}>
               <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="2" />
               <text x={paddingX - 15} y={y + 4} fontSize="12" fill="#94a3b8" textAnchor="end" fontWeight="500">
                 {score}
               </text>
             </g>
           )
        })}

        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#6366f1"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="6" fill="#ffffff" stroke="#6366f1" strokeWidth="3" className="transition-all duration-300" />

            <text x={p.x} y={height - 15} fontSize="15" fill="#334155" textAnchor="middle" fontWeight="600">
              {p.phase.title}
            </text>

            {p.phase.graphLabel && (
              <text
                x={p.x}
                y={p.y - 20}
                fontSize="14"
                fill="#1e293b"
                textAnchor="middle"
                fontWeight="700"
              >
                {p.phase.graphLabel}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');

  const [mapId, setMapId] = useState(() => window.location.hash.replace('#', '') || 'shared_data');

  const [phases, setPhases] = useState(initialData);
  const [globalInsights, setGlobalInsights] = useState(`喫煙所ジャーニーを通しての構造的気づき

1. 会話は目的ではなく「副産物」
・喫煙所に行く目的はあくまでタバコを吸うこと。
・人と話すことは意図していない。
・だからこそ会話が発生してもプレッシャーがない。
・「交流しに行く」ではなく、「結果的に交流が生まれる」構造が重要。

2. 強烈な来訪動機がある
・「吸いたい」という明確で習慣化された動機。
・行く努力が不要。
・正当な離席理由があるため心理的ハードルが低い。
・非喫煙空間との最大の差はここ。

3. なんとなく行ける軽さ
・退屈、一区切り、なんとなく。
・強い目的ではなく、軽い衝動。
・"行っても行かなくてもいい"状態がちょうどいい。

4. 半分プライベートな時間
・喫煙時間は業務時間から少し切り離された感覚。
・仕事の鎧が少し外れる。
・オフレコ感がある。
・気が緩んでいるからこそ会話が起きやすい。

5. 沈黙が許される空間
・会話がなくても成立する。
・タバコを吸うという行為があるから無言でも自然。
・失敗コストが低い。

6. 笑いが関係の加速装置
・笑いが起きると一気に距離が縮まる。
・言語化できない価値観の一致を感じる瞬間。
・共通項よりも感情共有の方が強い。

7. 遭遇の繰り返しが関係を育てる
・1回の深い会話よりも、短い接触の積み重ね。
・1ヶ月空くと気まずくなる。
・関係は「深さ」より「頻度」で形成される。

8. 紹介という安全装置
・知り合い経由で会話が始まるケースが多い。
・第三者がいることで安心感が生まれる。
・完全な1on1よりハードルが低い。`);
  const [globalMemo, setGlobalMemo] = useState(`喫煙所は「生理的欲求に紐づいた偶発的接点装置」

成立要素：
・正当な離席理由
・強い来訪動機
・短時間制
・半閉鎖空間
・沈黙許容
・繰り返し遭遇
・副産物としての会話

💡 最大の壁
非喫煙者向け空間には、
・強烈な来訪動機がない
・行くために努力が必要
・習慣化されない
という構造的課題がある。`);
  const [globalActionPlan, setGlobalActionPlan] = useState(`・タバコの代わりとなる"強い動機"は何か？
・正当な離席理由をどう設計するか？
・会話を目的化せずに偶発化できるか？`);

  const lastSavedData = React.useRef('');

  // 1. 認証の初期化
  useEffect(() => {
    if (!auth) {
      setIsLoaded(true);
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth error", e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. クラウド（Firestore）からのデータ読み込み
  useEffect(() => {
    if (!user || !db) return;

    setIsLoaded(false);

    const fetchData = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'journey_map', mapId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.phases) setPhases(data.phases);
          if (data.globalInsights !== undefined) setGlobalInsights(data.globalInsights);
          if (data.globalMemo !== undefined) setGlobalMemo(data.globalMemo);
          if (data.globalActionPlan !== undefined) setGlobalActionPlan(data.globalActionPlan);

          lastSavedData.current = JSON.stringify({
            phases: data.phases || initialData,
            globalInsights: data.globalInsights || '',
            globalMemo: data.globalMemo || '',
            globalActionPlan: data.globalActionPlan || ''
          });
        } else {
          lastSavedData.current = JSON.stringify({ phases: initialData, globalInsights: '', globalMemo: '', globalActionPlan: '' });
        }
      } catch (error) {
        console.error("Firestore fetch error:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchData();
  }, [user]);

  // 3. クラウド（Firestore）への自動保存
  useEffect(() => {
    if (!user || !db || !isLoaded) return;

    const currentDataStr = JSON.stringify({ phases, globalInsights, globalMemo, globalActionPlan });
    if (currentDataStr === lastSavedData.current) {
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'journey_map', mapId);
      try {
        await setDoc(docRef, {
          phases,
          globalInsights,
          globalMemo,
          globalActionPlan,
          updatedAt: new Date().toISOString()
        });
        lastSavedData.current = currentDataStr;
        setSaveStatus('saved');
      } catch(err) {
        console.error("Save error:", err);
        setSaveStatus('error');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [phases, globalInsights, globalMemo, globalActionPlan, user, isLoaded, mapId]);

  // URLハッシュの変更を監視
  useEffect(() => {
    const handleHashChange = () => {
      setMapId(window.location.hash.replace('#', '') || 'shared_data');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const updatePhase = (id, field, value) => {
    setPhases(phases.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">

      {/* ヘッダー */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-slate-800">
            <Map className="text-indigo-600" size={32} />
            喫煙所ジャーニーマップ
          </h1>
          <p className="text-slate-500 mt-2 text-sm flex items-center gap-2">
            <Edit3 size={16} />
            テキストやスライダーを変更して、マップを自由に編集できます。
          </p>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 shadow-sm flex items-center gap-1">
            🌍 共有モード (全員で同じデータを編集)
          </span>
          <div className={`flex items-center gap-2 text-sm font-bold bg-white px-4 py-2 rounded-full border-2 shadow-sm transition-all ${
            saveStatus === 'saving' ? 'border-amber-300 text-amber-600' :
            saveStatus === 'error' ? 'border-red-400 text-red-500' :
            'border-emerald-400 text-emerald-600'
          }`}>
            {saveStatus === 'saving' && <><Loader2 size={16} className="animate-spin" /> 保存中...</>}
            {saveStatus === 'saved' && <><Cloud size={16} /> 保存完了</>}
            {saveStatus === 'error' && <><CloudOff size={16} /> エラー</>}
          </div>
        </div>
      </header>

      {/* 上部：グラフエリア */}
      <JourneyGraph phases={phases} />

      {/* 中段：詳細カードエディタエリア (横スクロール) */}
      <div className="flex overflow-x-auto gap-6 pb-4 mb-8 snap-x snap-mandatory">
        {phases.map((phase, index) => (
          <div
            key={phase.id}
            className="snap-start shrink-0 w-[340px] md:w-[400px] bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
          >
            {/* カードヘッダー */}
            <div className="bg-slate-100/50 p-4 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">
                  Step {index}
                </span>
                <input
                  type="text"
                  value={phase.title}
                  onChange={(e) => updatePhase(phase.id, 'title', e.target.value)}
                  className="font-bold text-lg bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full transition-colors text-slate-800"
                  placeholder="フェーズ名"
                />
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Activity size={14} /> 感情スコア (グラフ連動)
                  </label>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {phase.emotionScore}
                  </span>
                </div>
                <input
                  type="range"
                  min="0" max="10"
                  value={phase.emotionScore}
                  onChange={(e) => updatePhase(phase.id, 'emotionScore', parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* カードボディ */}
            <div className="p-5 flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">

              <Field
                label="グラフ上の表示テキスト (任意)"
                value={phase.graphLabel}
                onChange={(v) => updatePhase(phase.id, 'graphLabel', v)}
                placeholder="例: 笑い・共感"
              />

              <hr className="my-5 border-slate-100" />

              <Field
                label="行動"
                type="textarea"
                value={phase.action}
                onChange={(v) => updatePhase(phase.id, 'action', v)}
              />
              <Field
                label="内的モチベーション"
                type="textarea"
                value={phase.motivation}
                onChange={(v) => updatePhase(phase.id, 'motivation', v)}
              />
              <Field
                label="感情の詳細"
                type="textarea"
                value={phase.emotionText}
                onChange={(v) => updatePhase(phase.id, 'emotionText', v)}
              />

              <div className="grid grid-cols-1 gap-0">
                <Field
                  label="時間感"
                  value={phase.time}
                  onChange={(v) => updatePhase(phase.id, 'time', v)}
                />
              </div>

              <Field
                label="物理 / 社会的トリガー"
                type="textarea"
                value={phase.trigger}
                onChange={(v) => updatePhase(phase.id, 'trigger', v)}
              />

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
                <Field
                  label="💡 小さな介入ポイント (転用のヒント)"
                  type="textarea"
                  rows={4}
                  value={phase.hint}
                  highlight={false}
                  onChange={(v) => updatePhase(phase.id, 'hint', v)}
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-4">
                <Field
                  label="🚀 打ち手 (具体的な施策)"
                  type="textarea"
                  rows={3}
                  value={phase.actionPlan || ''}
                  highlight={false}
                  onChange={(v) => updatePhase(phase.id, 'actionPlan', v)}
                  placeholder="このフェーズでの具体的な解決策やアクションを記入..."
                />
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <Field
                  label="📝 このフェーズのメモ・アイデア"
                  type="textarea"
                  rows={3}
                  value={phase.memo || ''}
                  onChange={(v) => updatePhase(phase.id, 'memo', v)}
                  placeholder="ここで思いついたことなどをメモ..."
                />
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* 下部：気づき 欄 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold">
          <Info size={20} className="text-blue-500" />
          <h3>気づき</h3>
        </div>
        <textarea
          value={globalInsights}
          onChange={(e) => setGlobalInsights(e.target.value)}
          placeholder="ジャーニーマップ全体を通しての気づきや発見を自由にメモしてください。"
          className="w-full h-20 text-sm border border-slate-200 bg-blue-50/30 hover:bg-blue-50/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-y leading-relaxed text-slate-700"
        />
      </div>

      {/* 下部：全体メモ 欄 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold">
          <FileText size={20} className="text-amber-500" />
          <h3>全体メモ</h3>
        </div>
        <textarea
          value={globalMemo}
          onChange={(e) => setGlobalMemo(e.target.value)}
          placeholder="全体に関するメモやアイデアなどを自由に記述してください。"
          className="w-full h-20 text-sm border border-slate-200 bg-amber-50/30 hover:bg-amber-50/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all resize-y leading-relaxed text-slate-700"
        />
      </div>

      {/* 下部：全体の打ち手 欄 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold">
          <Rocket size={20} className="text-emerald-500" />
          <h3>打ち手</h3>
        </div>
        <textarea
          value={globalActionPlan}
          onChange={(e) => setGlobalActionPlan(e.target.value)}
          placeholder="ジャーニー全体を通した具体的なアクションプランや施策を記入してください。"
          className="w-full h-20 text-sm border border-slate-200 bg-emerald-50/30 hover:bg-emerald-50/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all resize-y leading-relaxed text-slate-700"
        />
      </div>

      {/* カスタムスクロールバーのスタイル */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}

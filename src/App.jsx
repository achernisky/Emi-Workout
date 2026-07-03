import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient.js'

// ── DESIGN TOKENS ────────────────────────────────────────────
const AC  = '#7C3AED'
const ACB = 'rgba(124,58,237,0.09)'
const GR  = '#059669'
const GRB = 'rgba(5,150,105,0.10)'
const BG  = '#F4F3FA'
const CD  = '#FFFFFF'
const C2  = '#F0EFF8'
const TX  = '#1E1B4B'
const SB  = '#64748B'
const BD  = '#DDD9F0'

// ── SUPABASE STORAGE ─────────────────────────────────────────
const LS_H = 'emi_wt_hist_v1'
const LS_D = 'emi_wt_def_v1'
const LS_S = 'emi_wt_skip_v1'

async function loadData() {
  try {
    const { data, error } = await supabase
      .from('workout_data')
      .select('id, data')
      .in('id', ['history', 'defaults', 'skipped'])
    if (error) throw error
    const result = { hist: {}, defaults: {}, skipped: {} }
    data?.forEach(row => {
      if (row.id === 'history')  result.hist     = row.data || {}
      if (row.id === 'defaults') result.defaults = row.data || {}
      if (row.id === 'skipped')  result.skipped  = row.data || {}
    })
    if (Object.keys(result.hist).length)     localStorage.setItem(LS_H, JSON.stringify(result.hist))
    if (Object.keys(result.defaults).length) localStorage.setItem(LS_D, JSON.stringify(result.defaults))
    if (Object.keys(result.skipped).length)  localStorage.setItem(LS_S, JSON.stringify(result.skipped))
    return result
  } catch {
    return {
      hist:     JSON.parse(localStorage.getItem(LS_H) || '{}'),
      defaults: JSON.parse(localStorage.getItem(LS_D) || '{}'),
      skipped:  JSON.parse(localStorage.getItem(LS_S) || '{}'),
    }
  }
}

function lsKeyFor(key) { return key === 'history' ? LS_H : key === 'skipped' ? LS_S : LS_D }

async function saveData(key, val) {
  localStorage.setItem(lsKeyFor(key), JSON.stringify(val))
  try {
    const { data: row } = await supabase.from('workout_data').select('data').eq('id', key).maybeSingle()
    const serverVal = row?.data || {}
    const merged = key === 'history' ? mergeHist(serverVal, val) : { ...serverVal, ...val }
    localStorage.setItem(lsKeyFor(key), JSON.stringify(merged))
    await supabase.from('workout_data').upsert({
      id: key, data: merged, updated_at: new Date().toISOString(),
    })
  } catch { /* data already in localStorage */ }
}
function mergeHist(serverHist, localHist) {
  const merged = {}
  const allExIds = new Set([...Object.keys(serverHist), ...Object.keys(localHist)])
  for (const exId of allExIds) {
    const byDate = {}
    for (const s of (serverHist[exId] || [])) byDate[s.date] = s
    for (const s of (localHist[exId] || []))  byDate[s.date] = s
    merged[exId] = Object.values(byDate).sort((a, b) => a.date < b.date ? -1 : 1)
  }
  return merged
}

// ── VIDEO DEMO COMPONENT ─────────────────────────────────────
// yt = YouTube video ID (Shorts or regular). If null, shows search button.
function ExerciseVideo({ ex }) {
  if (ex.yt) {
    return (
      <div style={{margin:'0 16px 8px',borderRadius:12,overflow:'hidden',background:'#000',height:260}}>
        <iframe
          src={`https://www.youtube.com/embed/${ex.yt}?rel=0&modestbranding=1&playsinline=1`}
          title={ex.n}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{display:'block'}}
        />
      </div>
    )
  }
  const query = encodeURIComponent(`${ex.n} proper form tutorial`)
  return (
    <div style={{margin:'0 16px 12px'}}>
      <a
        href={`https://www.youtube.com/results?search_query=${query}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'14px 20px',
          background:'#FF0000',borderRadius:12,color:'white',textDecoration:'none',
          fontWeight:600,fontSize:15}}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="white"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
        <span>Watch Demo on YouTube</span>
      </a>
      <div style={{fontSize:11,color:SB,textAlign:'center',marginTop:6}}>Opens YouTube search · tap back when done</div>
    </div>
  )
}

// ── EXERCISE DATABASE ─────────────────────────────────────────
// yt: YouTube Short or video ID (null = show search button instead)
const DB = {
// ─ CHEST ─
'db-chest-press':{n:'DB Chest Press',m:'chest',loc:['home'],eq:'Dumbbells',yt:'-sNh_ZXobgw',
  steps:['Lie on back, DB each hand at chest, elbows at 90°','Press up to near-full extension','Lower 2 seconds — controlled descent'],
  cues:['Elbows at 45°, not flared wide','Core tight throughout','Slow lowering is where growth happens'],
  pri:['Chest'],sec:['Triceps','Shoulder'],alts:['push-up','incline-push-up','decline-push-up']},
'db-flye':{n:'DB Chest Flye',m:'chest',loc:['home'],eq:'Dumbbells',yt:'fKHCefJ9aP4',
  steps:['Lie on back, DBs above chest, slight elbow bend','Arc arms wide until you feel a chest stretch','Squeeze chest to bring arms back up'],
  cues:['Keep the slight elbow bend — never lock straight','Think: hugging a big tree','Feel the stretch at the bottom'],
  pri:['Chest'],sec:['Shoulder'],alts:['push-up','incline-push-up','decline-push-up']},
'push-up':{n:'Push-Up',m:'chest',loc:['home','gym'],eq:'Bodyweight',yt:null,
  steps:['High plank, hands slightly wider than shoulders','Lower chest toward floor, elbows at 45°','Push back up'],
  cues:['Straight line from head to heels','Exhale on the push up','Drop to knees if needed'],
  pri:['Chest'],sec:['Triceps','Core'],alts:['incline-push-up','decline-push-up','pec-deck']},
'hs-incline-press':{n:'Incline Press (Hammer Strength)',m:'chest',loc:['gym'],eq:'Hammer Strength',yt:'i3e4CG5tnfs',
  steps:['Adjust seat so handles are at upper chest height','Press forward-upward until arms nearly extended','Lower slowly — 2 seconds controlled'],
  cues:['Upper chest focus — feel it at the top of your pecs','Machine guides the path — still squeeze the chest','Don\'t lock elbows at full extension'],
  pri:['Upper Chest'],sec:['Triceps','Shoulder'],alts:['pec-deck','cable-chest-fly','assisted-dip']},
'hs-chest-press':{n:'Chest Press (Hammer Strength)',m:'chest',loc:['gym'],eq:'Hammer Strength',yt:'Nbh72taMf4w',
  steps:['Adjust seat so handles are at mid-chest height','Press forward until arms nearly extended','Lower slowly with control'],
  cues:['Keep lower back against the pad','Don\'t lock elbows at the end','2-second controlled return'],
  pri:['Chest'],sec:['Triceps','Shoulder'],alts:['pec-deck','assisted-dip','cable-chest-fly']},
'pec-deck':{n:'Pec Deck (Chest Fly)',m:'chest',loc:['gym'],eq:'Machine',yt:null,
  steps:['Sit with back flat on pad, elbows on the arm pads','Bring arms together — squeeze chest hard','Open slowly back to stretch position'],
  cues:['Squeeze hard at center — that\'s the key','Don\'t let weights slam on the return','Keep slight elbow bend throughout'],
  pri:['Chest'],sec:['Shoulder'],alts:['cable-chest-fly','assisted-dip']},
'assisted-dip':{n:'Assisted Dip Machine',m:'chest',loc:['gym'],eq:'Machine',yt:null,
  steps:['Set assistance weight (higher = easier)','Grip handles, lower until elbows at 90°','Press back up to full extension'],
  cues:['Lean slightly forward for chest focus','Full range of motion every rep','Decrease assistance over time'],
  pri:['Chest','Triceps'],sec:['Shoulder'],alts:['cable-chest-fly','pec-deck']},
'cable-chest-fly':{n:'Cable Chest Fly',m:'chest',loc:['gym'],eq:'Cable (Matrix)',yt:null,
  steps:['Cables at shoulder height, step forward slightly','Arc handles together in front of chest','Open slowly maintaining constant cable tension'],
  cues:['Slight elbow bend — never lock straight','Think: hugging someone','Cable keeps tension at bottom = great stretch'],
  pri:['Chest'],sec:['Shoulder'],alts:['pec-deck','assisted-dip']},
'incline-push-up':{n:'Incline Push-Up',m:'chest',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Hands on a sturdy elevated surface, body in a straight line','Lower chest toward the surface, elbows at 45°','Push back up to start'],
  cues:['Higher hands = easier, more shoulder-friendly variation','Great option to build up to a full push-up','Keep hips from sagging'],
  pri:['Upper Chest'],sec:['Triceps','Shoulder'],alts:['push-up','decline-push-up']},
'decline-push-up':{n:'Decline Push-Up',m:'chest',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Feet elevated on a couch or step, hands on floor','Lower chest toward floor, elbows at 45°','Push back up to start'],
  cues:['Feet elevation shifts more focus to upper chest','Keep core tight so hips don\'t drop','Harder than a standard push-up — regress if form breaks'],
  pri:['Upper Chest'],sec:['Triceps','Shoulder'],alts:['push-up','incline-push-up']},
// ─ BACK ─
'db-row':{n:'Dumbbell Row',m:'back',loc:['home','gym'],eq:'Dumbbell',yt:'H8jf3DwlIlo',
  steps:['One hand + knee on surface for support','DB in other hand, arm hanging','Pull to hip, driving elbow past your back','Lower slowly'],
  cues:['Drive the elbow back — not just the hand up','Back flat throughout','Squeeze your back at the top'],
  pri:['Lats','Rhomboids'],sec:['Biceps','Rear Shoulder'],alts:['superman','db-renegade-row','db-pullover','rev-grip-pulldown']},
'db-reverse-flye':{n:'DB Reverse Flye',m:'back',loc:['home','gym'],eq:'Dumbbells',yt:'LsT-bR_zxLo',
  steps:['Hinge forward at hips, back flat, DBs hanging','Raise both arms out to sides like wings','Squeeze shoulder blades together at top, lower slowly'],
  cues:['Think: squeezing a pencil between shoulder blades','Light weight only — this is a detail move','Maintain the forward lean throughout'],
  pri:['Rear Deltoid','Rhomboids'],sec:['Traps'],alts:['superman','db-renegade-row','db-pullover','underhand-bent-row']},
'superman':{n:'Superman Hold',m:'back',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Lie face down, arms extended in front','Lift arms and legs simultaneously','Hold 2 seconds at top, lower slowly'],
  cues:['Squeeze glutes and lower back at top','Look at the floor — don\'t crane neck','Even small lifts are effective'],
  pri:['Lower Back','Glutes'],sec:['Hamstrings'],alts:['db-renegade-row','db-pullover']},
'db-renegade-row':{n:'DB Renegade Row',m:'back',loc:['home'],eq:'Dumbbells',yt:null,
  steps:['High plank holding a DB in each hand','Row one DB to hip, keeping hips square','Lower and repeat on the other side'],
  cues:['Hips stay level — resist the twist','Wide foot stance for stability','Slow and controlled beats fast and sloppy'],
  pri:['Lats','Rhomboids'],sec:['Core','Biceps'],alts:['superman','db-pullover']},
'db-pullover':{n:'DB Pullover',m:'back',loc:['home'],eq:'Dumbbell',yt:null,
  steps:['Lie on back (or bench), one DB held with both hands above chest','Lower DB back behind head with slight elbow bend','Pull back up over chest, squeezing lats'],
  cues:['Feel the stretch through the lats at the bottom','Keep ribs down — don\'t let the back arch','Light weight — this is a stretch-focused move'],
  pri:['Lats'],sec:['Chest','Triceps'],alts:['superman','db-renegade-row']},
'lat-pulldown':{n:'Lat Pulldown',m:'back',loc:['gym'],eq:'Cable Machine',yt:'jULa7guhCdM',
  steps:['Lock thighs under pad, wide grip on bar, lean back slightly','Pull bar to upper chest driving elbows down and back','Let bar rise slowly — full stretch at top'],
  cues:['Lead with elbows — not your hands','Chest up and open throughout','No swinging or yanking'],
  pri:['Lats'],sec:['Biceps','Rhomboids'],alts:['rev-grip-pulldown','back-extension','assisted-pull-up']},
'seated-cable-row':{n:'Seated Cable Row',m:'back',loc:['gym'],eq:'Cable Machine',yt:'8QuMq1GMMng',
  steps:['Sit at cable row, feet on platform, back straight','Pull handle to lower chest, squeezing shoulder blades','Return slowly — let cable stretch you forward'],
  cues:['Don\'t round your back reaching forward','At the pull: elbows behind body, chest proud','Control the return — don\'t get yanked forward'],
  pri:['Lats','Rhomboids'],sec:['Biceps','Rear Shoulder'],alts:['underhand-bent-row','back-extension','assisted-pull-up']},
'rev-grip-pulldown':{n:'Reverse Grip Pulldown',m:'back',loc:['gym'],eq:'Cable Machine',yt:null,
  steps:['Grip bar with palms facing you (underhand), shoulder-width','Pull down to upper chest, elbows driving close to sides','Lower slowly with full stretch at top'],
  cues:['Underhand grip hits lower lats + biceps more','Elbows stay closer to body than regular pulldown','Full stretch at top every rep'],
  pri:['Lats (Lower)','Biceps'],sec:['Rhomboids'],alts:['underhand-bent-row','back-extension','assisted-pull-up']},
'underhand-bent-row':{n:'Underhand Bent-Over Row',m:'back',loc:['gym'],eq:'Smith Machine / Cable (Straight Bar)',yt:null,
  steps:['Bar at hip height, grip with palms facing UP (underhand)','Slight forward lean, feet shoulder-width','Pull bar to waist level, driving elbows back','Lower slowly'],
  cues:['Palms up = underhand/supinated grip throughout','Less forward lean than a standard row — more upright','Hits lower lats and involves biceps more than overhand'],
  pri:['Lats (Lower)','Rhomboids'],sec:['Biceps'],alts:['rev-grip-pulldown','back-extension','assisted-pull-up']},
'back-extension':{n:'Back Extension Machine',m:'back',loc:['gym'],eq:'Machine',yt:null,
  steps:['Position hips at pad edge, feet secured','Cross arms on chest or hold weight','Hinge forward at hips, then extend back to neutral'],
  cues:['Don\'t hyperextend past neutral at the top','Use lower back and glutes to come up','Slow controlled — not a momentum swing'],
  pri:['Lower Back'],sec:['Glutes','Hamstrings'],alts:['rev-grip-pulldown','underhand-bent-row','assisted-pull-up']},
'assisted-pull-up':{n:'Assisted Pull-Up Machine',m:'back',loc:['gym'],eq:'Machine',yt:null,
  steps:['Set assistance weight (higher = easier)','Kneel on pad, wide grip, palms facing away','Pull until chin clears handles, lower slowly'],
  cues:['Machine counterbalances your bodyweight','Focus on pulling elbows down and back','Decrease assistance over time'],
  pri:['Lats'],sec:['Biceps'],alts:['rev-grip-pulldown','underhand-bent-row','back-extension']},
// ─ SHOULDERS ─
'db-shoulder-press':{n:'DB Shoulder Press',m:'shoulders',loc:['home','gym'],eq:'Dumbbells',yt:'aedn4SSc3Ww',
  steps:['DBs at shoulder height, elbows at 90°','Press overhead to near-full extension','Lower back to shoulder height slowly'],
  cues:['Core tight — don\'t lean back','Stop just short of locking elbows','Wrists stay straight'],
  pri:['Front & Side Deltoid'],sec:['Triceps'],alts:['arnold-press','db-front-raise','pike-push-up','cable-upright-row']},
'db-lateral-raise':{n:'DB Lateral Raise',m:'shoulders',loc:['home','gym'],eq:'Dumbbells',yt:'JIhbYYA1Q90',
  steps:['Stand with light DBs at sides','Raise both arms out — stop at shoulder height','Lower very slowly — 3 seconds down'],
  cues:['Lead with elbows, not your wrists','LIGHT weight — less than you think','Don\'t go above shoulder height'],
  pri:['Side Deltoid'],sec:['Front Deltoid'],alts:['cable-upright-row','face-pull','arnold-press','db-front-raise']},
'shoulder-press-machine':{n:'Shoulder Press Machine',m:'shoulders',loc:['gym'],eq:'Machine',yt:'_ae_7jJqJQ0',
  steps:['Adjust seat, handles at shoulder height','Press overhead to near-full extension','Lower back to shoulder height slowly'],
  cues:['Head stays against headrest','Core engaged — don\'t arch back','Smooth press, controlled return'],
  pri:['Front & Side Deltoid'],sec:['Triceps'],alts:['cable-upright-row','face-pull','arnold-press']},
'cable-upright-row':{n:'Cable Upright Row',m:'shoulders',loc:['gym'],eq:'Cable (Straight Bar)',yt:null,
  steps:['Stand at cable machine, straight bar attached low','Pull bar up to chin level, elbows flaring out to sides','Lower slowly with control'],
  cues:['Elbows lead — always higher than wrists','Don\'t pull above chin level','Hits front + side delts and upper traps'],
  pri:['Front & Side Deltoid','Traps'],sec:[],alts:['face-pull','arnold-press']},
'face-pull':{n:'Face Pull (Rope)',m:'shoulders',loc:['gym'],eq:'Cable (Rope)',yt:null,
  steps:['Cable at head height, rope attachment','Pull rope toward your face, elbows flaring out high','Squeeze shoulder blades at the end'],
  cues:['Elbows stay HIGH — at ear level','External rotation at end: thumbs pointing back','Great for shoulder health, rear delts, and posture'],
  pri:['Rear Deltoid','External Rotators'],sec:['Traps'],alts:['cable-upright-row','arnold-press']},
'arnold-press':{n:'Arnold Press',m:'shoulders',loc:['home','gym'],eq:'Dumbbells',yt:null,
  steps:['Start with DBs at chin, palms facing you','Rotate palms outward as you press up','At top palms face forward — reverse on way down'],
  cues:['Smooth rotation throughout','Hits all three deltoid heads','Named after the governor — it works'],
  pri:['All Deltoid Heads'],sec:['Triceps'],alts:['db-front-raise','pike-push-up','face-pull']},
'db-front-raise':{n:'DB Front Raise',m:'shoulders',loc:['home'],eq:'Dumbbells',yt:null,
  steps:['Stand holding DBs at thighs, palms facing in','Raise arms straight in front to shoulder height','Lower slowly back to start'],
  cues:['Light weight — this is a small muscle, isolated','Don\'t swing the torso to generate momentum','Stop at shoulder height, don\'t go higher'],
  pri:['Front Deltoid'],sec:[],alts:['arnold-press','pike-push-up']},
'pike-push-up':{n:'Pike Push-Up',m:'shoulders',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Hips high in a pike position, hands and feet on floor','Lower head toward the floor bending elbows','Press back up to start'],
  cues:['The more vertical your torso, the more shoulder focus','Keep hips high throughout — don\'t let them sag','Elevate feet on a step to make it harder'],
  pri:['Front & Side Deltoid'],sec:['Triceps'],alts:['arnold-press','db-front-raise']},
// ─ BICEPS ─
'db-curl':{n:'Dumbbell Curl',m:'biceps',loc:['home','gym'],eq:'Dumbbells',yt:'MKWBV29S6c0',
  steps:['Stand, DBs at sides palms forward','Curl both to shoulders, elbows at sides','Lower slowly — all the way down'],
  cues:['Elbows stay glued to sides','Squeeze at the top','Slow descent = more growth'],
  pri:['Biceps'],sec:['Forearms'],alts:['concentration-curl','rotating-hammer-curl','db-zottman-curl']},
'hammer-curl':{n:'Hammer Curl',m:'biceps',loc:['home','gym'],eq:'Dumbbells',yt:'NyW2fT2gQhM',
  steps:['DBs at sides, palms facing each other (thumbs up)','Curl up keeping palms facing each other','Lower slowly'],
  cues:['Neutral grip hits outer bicep + forearm more','Elbows stay at sides','Can alternate or do both at once'],
  pri:['Biceps','Brachialis'],sec:['Forearms'],alts:['rotating-hammer-curl','concentration-curl','db-zottman-curl']},
'preacher-curl-machine':{n:'Preacher Curl Machine',m:'biceps',loc:['gym'],eq:'Machine',yt:'Htw-s61mOw0',
  steps:['Sit facing machine, rest upper arms on the angled pad in front','Curl handles toward face','Lower slowly to full extension — feel the stretch'],
  cues:['Pad locks elbows in front — no cheating possible','Full stretch at the bottom is the key','Squeeze hard at the top'],
  pri:['Biceps (Short Head)'],sec:[],alts:['cable-curl','concentration-curl','seated-db-concentration']},
'seated-curl-machine':{n:'Seated Bicep Curl Machine',m:'biceps',loc:['gym'],eq:'Machine',yt:'XFAYzZgcbSc',
  steps:['Sit with pad behind upper arms, arms hang at sides','Curl handles toward shoulders','Lower to full stretch'],
  cues:['Pad behind the arm = great stretch on the long head','Don\'t rush — controlled throughout','Feel the full stretch at the bottom'],
  pri:['Biceps (Long Head)'],sec:[],alts:['concentration-curl','seated-db-concentration','cable-curl']},
'concentration-curl':{n:'Concentration Curl',m:'biceps',loc:['home','gym'],eq:'Dumbbell',yt:null,
  steps:['Sit on end of bench, lean forward slightly','Brace elbow on inner thigh, DB hanging','Curl up toward face, squeeze at top, lower all the way'],
  cues:['Elbow on leg = zero cheating possible','Hold and squeeze at the top for 1 second','Great for bicep peak'],
  pri:['Biceps'],sec:[],alts:['rotating-hammer-curl','db-zottman-curl','seated-db-concentration']},
'db-zottman-curl':{n:'DB Zottman Curl',m:'biceps',loc:['home'],eq:'Dumbbells',yt:null,
  steps:['Curl DBs up with palms facing up (normal curl)','At the top, rotate palms to face down','Lower slowly with palms down, rotate back at bottom'],
  cues:['The slow palms-down lowering is where this earns its keep','Elbows stay pinned at sides','Builds forearms along with biceps'],
  pri:['Biceps','Forearms'],sec:[],alts:['concentration-curl','rotating-hammer-curl']},
'seated-db-concentration':{n:'Seated DB Curl (Between Legs)',m:'biceps',loc:['gym'],eq:'Dumbbell',yt:null,
  steps:['Sit at end of bench, hold DB with both hands between knees','Curl up toward chin with both hands','Lower slowly, full stretch at bottom'],
  cues:['Two-handed grip = more stability','Works biceps with slightly different angle','Keep back straight throughout'],
  pri:['Biceps'],sec:['Forearms'],alts:['concentration-curl','cable-curl','rotating-hammer-curl']},
'rotating-hammer-curl':{n:'Rotating Hammer Curl',m:'biceps',loc:['home','gym'],eq:'Dumbbells',yt:null,
  steps:['Start like a hammer curl (palms in, thumbs up)','As you curl up, rotate palm toward ceiling at the top','Lower reversing the rotation'],
  cues:['The rotation at top fully contracts the bicep','Smooth rotation — don\'t jerk it','Also called Zottman curl'],
  pri:['Biceps','Brachialis'],sec:['Forearms'],alts:['concentration-curl','db-zottman-curl','cable-curl']},
'cable-curl':{n:'Cable Curl (V-Bar)',m:'biceps',loc:['gym'],eq:'Cable (V-Bar)',yt:null,
  steps:['Cable at low position, V-bar attachment','Step back slightly, curl up toward chin','Lower slowly with constant cable tension'],
  cues:['V-bar = neutral grip for outer bicep','Cable keeps tension at bottom = advantage over DBs','Elbows stay at sides'],
  pri:['Biceps','Brachialis'],sec:['Forearms'],alts:['concentration-curl','seated-db-concentration','rotating-hammer-curl']},
// ─ TRICEPS ─
'db-overhead-ext':{n:'DB Overhead Extension',m:'triceps',loc:['home','gym'],eq:'Dumbbell',yt:'b_r_LW4HEcM',
  steps:['Hold one DB with both hands overhead','Lower it behind head by bending elbows','Press back up until arms straight'],
  cues:['Keep elbows pointing forward — don\'t flare','Upper arms stay still — only forearms move','Great stretch at the bottom'],
  pri:['Triceps (Long Head)'],sec:[],alts:['close-grip-push-up','diamond-push-up','bench-chair-dips','overhead-cable-ext']},
'db-kickback':{n:'Tricep Kickback',m:'triceps',loc:['home','gym'],eq:'Dumbbell',yt:'3Bv1n7-DN7c',
  steps:['Hinge forward, upper arm parallel to floor','Extend forearm back until arm fully straight','Lower forearm slowly'],
  cues:['Upper arm STAYS parallel to floor — this is everything','Squeeze at full extension','Light weight, perfect form'],
  pri:['Triceps'],sec:[],alts:['close-grip-push-up','diamond-push-up','bench-chair-dips','skull-crushers']},
'close-grip-push-up':{n:'Close-Grip Push-Up',m:'triceps',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Push-up position, hands directly under shoulders','Lower keeping elbows close to body','Push back up'],
  cues:['Elbows graze your sides on the way down','More tricep than regular push-up','Drop to knees if needed'],
  pri:['Triceps'],sec:['Chest'],alts:['diamond-push-up','bench-chair-dips']},
'bench-chair-dips':{n:'Bench/Chair Dips',m:'triceps',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Hands on the edge of a sturdy chair or bench behind you','Lower body by bending elbows to about 90°','Press back up to full extension'],
  cues:['Keep elbows pointing back, not flaring out','Legs straight out for harder, bent for easier','Don\'t let shoulders shrug up toward ears'],
  pri:['Triceps'],sec:['Chest','Shoulder'],alts:['close-grip-push-up','diamond-push-up']},
'diamond-push-up':{n:'Diamond Push-Up',m:'triceps',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['High plank, hands together under chest forming a diamond shape','Lower chest to hands, elbows close to body','Push back up to start'],
  cues:['Hardest push-up variation — regress to knees if needed','Elbows stay tucked, not flared','More tricep emphasis than a standard push-up'],
  pri:['Triceps'],sec:['Chest'],alts:['close-grip-push-up','bench-chair-dips']},
'cable-pushdown-rope':{n:'Cable Pushdown (Rope)',m:'triceps',loc:['gym'],eq:'Cable (Rope)',yt:'aHfbuBf1TJk',
  steps:['Cable up high with rope attachment','Elbows tucked at sides, start at 90°','Push down flaring rope apart at bottom, squeeze','Return slowly to 90°'],
  cues:['Elbows don\'t move — they\'re the pivot','Flare rope apart at the bottom for extra squeeze','Don\'t lean too far forward'],
  pri:['Triceps'],sec:[],alts:['overhead-cable-ext','skull-crushers','one-arm-cable-pushdown']},
'cable-pushdown-reverse':{n:'Cable Pushdown (Reverse Grip)',m:'triceps',loc:['gym'],eq:'Cable (Curl Bar)',yt:'PO3ccHaxlIM',
  steps:['Cable up high, EZ-curl bar, palms facing DOWN (overhand grip)','Elbows tucked at sides, push bar down','Return slowly'],
  cues:['Overhand/reverse grip shifts emphasis to the lateral tricep head','Same pivot-point concept as regular pushdown','Elbows stay at sides throughout'],
  pri:['Triceps (Lateral Head)'],sec:['Forearms'],alts:['overhead-cable-ext','skull-crushers','one-arm-cable-pushdown']},
'overhead-cable-ext':{n:'Overhead Cable Extension',m:'triceps',loc:['gym'],eq:'Cable (Curl Bar)',yt:null,
  steps:['Cable at low position, EZ curl bar attachment','Stand facing away, hold bar overhead, elbows bent','Extend arms forward-upward overhead, then lower slowly'],
  cues:['Excellent long head stretch','Keep elbows pointed up — don\'t flare out','Step away from cable for proper tension'],
  pri:['Triceps (Long Head)'],sec:[],alts:['skull-crushers','one-arm-cable-pushdown']},
'skull-crushers':{n:'Skull Crushers (Dumbbell)',m:'triceps',loc:['gym'],eq:'Dumbbells',yt:null,
  steps:['Lie on a bench holding a DB in each hand above chest','Lower DBs toward the sides of your head by bending elbows','Press back up to full extension'],
  cues:['Elbows stay pointed at the ceiling — don\'t let them flare','Only the forearms move','Squeeze triceps hard at the top'],
  pri:['Triceps (Long Head)'],sec:[],alts:['overhead-cable-ext','one-arm-cable-pushdown']},
'one-arm-cable-pushdown':{n:'Single-Arm Cable Pushdown',m:'triceps',loc:['gym'],eq:'Cable (No Attachment)',yt:null,
  steps:['Hold the cable clip/ball directly (no attachment)','Elbow tucked at side, push down to full extension','Return slowly, repeat then switch arms'],
  cues:['Single arm = better isolation, no cheating with other side','Hold the cable end directly — fully valid technique','Squeeze at full extension each rep'],
  pri:['Triceps'],sec:[],alts:['overhead-cable-ext','skull-crushers']},
// ─ QUADS ─
'goblet-squat':{n:'Goblet Squat',m:'quads',loc:['home'],eq:'Dumbbell',yt:'eLX_dyvooKQ',
  steps:['Hold one DB vertically at chest','Feet shoulder-width, toes slightly out','Squat until thighs parallel, drive up through heels'],
  cues:['Chest stays up — no rounding forward','Knees track over toes','Push knees out as you lower'],
  pri:['Quadriceps'],sec:['Glutes','Core'],alts:['sumo-squat','db-bulgarian-split-squat','db-step-up']},
'db-lunge':{n:'Dumbbell Lunge',m:'quads',loc:['home','gym'],eq:'Dumbbells',yt:'_lSFEA3uYY0',
  steps:['DBs at sides, stand tall','Step forward, lower back knee toward floor','Push off front foot to return, alternate legs'],
  cues:['Front knee stays behind toes — big enough step','Torso stays upright','Balance is part of this exercise'],
  pri:['Quadriceps'],sec:['Glutes','Hamstrings'],alts:['sumo-squat','db-bulgarian-split-squat','db-step-up','smith-front-squat']},
'sumo-squat':{n:'Sumo Squat',m:'quads',loc:['home'],eq:'Dumbbell',yt:null,
  steps:['Feet wider than shoulder-width, toes out','Hold DB between legs','Squat down chest up, drive through heels'],
  cues:['Wide stance = more inner thigh + glutes','Knees push out in line with toes','Keep DB from touching floor'],
  pri:['Quadriceps','Inner Thigh'],sec:['Glutes'],alts:['db-bulgarian-split-squat','db-step-up']},
'db-step-up':{n:'DB Step-Up',m:'quads',loc:['home'],eq:'Dumbbells',yt:null,
  steps:['DBs at sides, step one foot onto a sturdy elevated surface','Drive through that heel to stand fully on top','Step back down with control, repeat then switch legs'],
  cues:['Drive through the working leg — don\'t push off the bottom foot','Full stand at the top, no half-reps','Use a step low enough for control'],
  pri:['Quadriceps'],sec:['Glutes'],alts:['sumo-squat','db-bulgarian-split-squat']},
'smith-squat':{n:'Smith Machine Squat',m:'quads',loc:['gym'],eq:'Smith Machine',yt:'fC5urG2CCr8',
  steps:['Bar across upper back, feet shoulder-width','Squat until thighs parallel','Drive up through heels'],
  cues:['Smith guides bar path — still maintain form','Drive knees outward over toes','Chest up throughout'],
  pri:['Quadriceps'],sec:['Glutes','Hamstrings'],alts:['smith-front-squat','db-walking-lunge','db-bulgarian-split-squat']},
'leg-press-quad':{n:'Leg Press — Quad Focus',m:'quads',loc:['gym'],eq:'Leg Press Machine',yt:'nDh_BlnLCGc',
  steps:['Feet close together and LOW on the platform','Lower until knees near 90°','Press back up — never lock knees'],
  cues:['Close, low foot placement = outer quad emphasis','Don\'t let lower back peel off seat at bottom','Never fully lock knees at extension'],
  pri:['Outer Quadriceps'],sec:['Quads'],alts:['smith-front-squat','db-walking-lunge','db-bulgarian-split-squat']},
'leg-extension':{n:'Leg Extension Machine',m:'quads',loc:['gym'],eq:'Machine',yt:'iQ92TuvBqRo',
  steps:['Sit, ankles under roller pad','Extend legs until nearly straight — squeeze quads hard at top','Lower slowly — 2-3 seconds down'],
  cues:['Full extension at top — really squeeze','Slow descent is critical','Adjust ankle pad just above your shoes'],
  pri:['Quadriceps'],sec:[],alts:['smith-front-squat','db-walking-lunge','db-bulgarian-split-squat']},
'db-bulgarian-split-squat':{n:'DB Bulgarian Split Squat',m:'quads',loc:['home','gym'],eq:'Dumbbells',yt:null,
  steps:['Rear foot elevated on a bench or step, DBs at sides','Lower until front thigh is near parallel','Drive through the front heel to stand back up'],
  cues:['Most of your weight stays on the front leg','Torso stays upright — slight forward lean is fine','Balance takes practice — hold something at first if needed'],
  pri:['Quadriceps'],sec:['Glutes'],alts:['sumo-squat','db-step-up','smith-front-squat']},
'smith-front-squat':{n:'Smith Machine Front Squat',m:'quads',loc:['gym'],eq:'Smith Machine',yt:null,
  steps:['Bar racked across the front of the shoulders, elbows high','Squat down until thighs are near parallel','Drive up through the heels to standing'],
  cues:['Front position shifts emphasis onto the quads','Keep elbows up — dropping them dumps the bar forward','Smith guides the bar path — still control the descent'],
  pri:['Quadriceps'],sec:['Glutes'],alts:['db-walking-lunge','db-bulgarian-split-squat']},
'db-walking-lunge':{n:'DB Walking Lunge',m:'quads',loc:['gym'],eq:'Dumbbells',yt:null,
  steps:['DBs at sides, step forward into a lunge','Drive through the front heel to bring the back foot through into the next lunge','Continue alternating legs moving forward'],
  cues:['Torso stays upright throughout','Each step is a full rep — don\'t rush the transitions','Great finisher for a gym leg day'],
  pri:['Quadriceps'],sec:['Glutes','Hamstrings'],alts:['smith-front-squat','db-bulgarian-split-squat']},
// ─ HAMSTRINGS ─
'floor-db-leg-curl':{n:'Floor DB Leg Curl',m:'hamstrings',loc:['home'],eq:'Dumbbell',yt:'J7iDhZO0LxI',
  steps:['Lie face down, hold DB between ankles','Curl heels toward glutes','Lower slowly — full stretch at bottom'],
  cues:['Keep hips pressed to floor throughout','Start light — DB between feet takes practice','Slow controlled movement'],
  pri:['Hamstrings'],sec:['Glutes'],alts:['db-romanian-deadlift','single-leg-db-rdl','db-good-morning']},
'nordic-curl':{n:'Nordic Curl',m:'hamstrings',loc:['home'],eq:'Bodyweight',yt:'2WLaEeO7RL0',
  steps:['Kneel on mat, anchor feet under couch or heavy furniture','Slowly lower torso toward floor, hips straight','Catch yourself with hands at bottom, push back up'],
  cues:['Lower AS SLOWLY AS POSSIBLE — the eccentric is everything','Using your hands to push back up is completely fine','One of the best hamstring exercises in existence'],
  pri:['Hamstrings'],sec:['Glutes'],alts:['db-romanian-deadlift','single-leg-db-rdl','db-good-morning']},
'db-romanian-deadlift':{n:'DB Romanian Deadlift',m:'hamstrings',loc:['home','gym'],eq:'Dumbbells',yt:null,
  steps:['Stand holding DBs in front of thighs, feet hip-width','Hinge at the hips, lowering DBs along the legs','Drive hips forward to return to standing'],
  cues:['Knees stay soft — this is a hip hinge, not a squat','Keep DBs close to the legs throughout','Feel a deep hamstring stretch at the bottom'],
  pri:['Hamstrings'],sec:['Glutes','Lower Back'],alts:['single-leg-db-rdl','db-good-morning','seated-leg-curl']},
'single-leg-db-rdl':{n:'Single-Leg DB RDL',m:'hamstrings',loc:['home'],eq:'Dumbbells',yt:null,
  steps:['Stand on one leg holding a DB in each hand','Hinge forward, extending the free leg straight back','Return to standing, repeat then switch legs'],
  cues:['Hips stay square — don\'t let them rotate open','Soft bend in the standing knee throughout','Balance improves fast with practice'],
  pri:['Hamstrings'],sec:['Glutes','Core'],alts:['db-romanian-deadlift','db-good-morning']},
'db-good-morning':{n:'DB Good Morning',m:'hamstrings',loc:['home'],eq:'Dumbbells',yt:null,
  steps:['DBs at shoulders or held at chest, feet shoulder-width','Hinge forward at the hips, back flat','Return to standing by driving hips forward'],
  cues:['This is a hip hinge, not a squat — knees stay soft','Feel the stretch through the hamstrings','Keep the weight close to the body throughout'],
  pri:['Hamstrings'],sec:['Lower Back','Glutes'],alts:['db-romanian-deadlift','single-leg-db-rdl']},
'lying-leg-curl':{n:'Prone Leg Curl',m:'hamstrings',loc:['gym'],eq:'Machine',yt:'WKFzO6U6lE4',
  steps:['Lie face down, ankle pads above heels','Curl heels toward glutes as far as possible','Lower slowly — full stretch at bottom'],
  cues:['Best machine position for hamstrings — prefer over seated','Hips stay pressed to pad — don\'t let them lift','Squeeze at top of each rep'],
  pri:['Hamstrings'],sec:['Calves'],alts:['seated-leg-curl','leg-press-glute-ham','db-romanian-deadlift']},
'seated-leg-curl':{n:'Seated Leg Curl',m:'hamstrings',loc:['gym'],eq:'Machine',yt:null,
  steps:['Sit with back against pad, ankles over roller pad','Pull heels down and back toward seat','Return slowly to start'],
  cues:['Use when prone machine is taken','Slightly different stretch angle — still very effective','Control the return all the way up'],
  pri:['Hamstrings'],sec:[],alts:['leg-press-glute-ham','db-romanian-deadlift']},
'leg-press-glute-ham':{n:'Leg Press — Glute / Ham Focus',m:'hamstrings',loc:['gym'],eq:'Leg Press Machine',yt:null,
  steps:['Feet WIDE and HIGH on the platform','Lower platform deep for maximum hip flexion','Press back up'],
  cues:['Wide, high placement = hamstrings and glutes take over','Go deeper than you would for quad-focused leg press','Never lock knees at the top'],
  pri:['Hamstrings','Glutes'],sec:[],alts:['seated-leg-curl','db-romanian-deadlift']},
// ─ GLUTES ─
'hip-thrust-db':{n:'Hip Thrust (DB)',m:'glutes',loc:['home'],eq:'DB + Couch/Chair',yt:'fv6EfDZ0E28',
  steps:['Upper back on edge of couch, DB across hips','Drive hips up until body is in a straight line','Lower slowly, hips just above floor'],
  cues:['SQUEEZE glutes at the top — don\'t just go up','Chin tucked, core braced','Drive through the whole foot, not just heels'],
  pri:['Glutes'],sec:['Hamstrings'],alts:['glute-bridge','single-leg-glute-bridge','fire-hydrant']},
'glute-bridge':{n:'Glute Bridge',m:'glutes',loc:['home','gym'],eq:'Bodyweight',yt:null,
  steps:['Lie on back, knees bent, feet flat','Drive hips up squeezing glutes, hold 1-2 sec','Lower slowly'],
  cues:['Add DB on hips when bodyweight gets easy','Full squeeze at top every rep','Great hamstring loading too'],
  pri:['Glutes','Hamstrings'],sec:[],alts:['single-leg-glute-bridge','fire-hydrant','db-hip-thrust']},
'single-leg-glute-bridge':{n:'Single-Leg Glute Bridge',m:'glutes',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Lie on back, one foot flat, other leg extended straight','Drive hips up through the planted heel','Squeeze at the top, lower slowly, repeat then switch'],
  cues:['Hips stay level — don\'t let one side dip','Squeeze the glute, not the lower back','Add a DB on the hips once bodyweight is easy'],
  pri:['Glutes'],sec:['Hamstrings'],alts:['glute-bridge','fire-hydrant']},
'fire-hydrant':{n:'Fire Hydrant',m:'glutes',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['On hands and knees, core braced','Keeping knee bent, lift leg out to the side','Lower slowly, repeat then switch sides'],
  cues:['Hips stay square to the floor — don\'t rotate','Small controlled range beats a big swinging kick','Add an ankle weight to progress'],
  pri:['Glute Medius'],sec:['Hips'],alts:['glute-bridge','single-leg-glute-bridge']},
'donkey-kick':{n:'Donkey Kick',m:'glutes',loc:['home'],eq:'Bodyweight',yt:'5tkFcqhCJt8',
  steps:['On hands and knees','Keep knee bent at 90°, kick one leg up and back','Squeeze glute at top, lower, repeat then switch'],
  cues:['Hips stay SQUARE — don\'t rotate','It\'s about the glute squeeze, not the height','Add ankle weights when bodyweight gets easy'],
  pri:['Glutes'],sec:['Hamstrings'],alts:['glute-bridge','single-leg-glute-bridge','fire-hydrant']},
'kickback-machine':{n:'Glute Kickback Machine',m:'glutes',loc:['gym'],eq:'Machine',yt:'3fBptAH0Rnw',
  steps:['Stand at machine, chest against front pad','Working foot on platform, kick back to full extension','Squeeze glute at top, return slowly'],
  cues:['Full extension + squeeze every single rep','Controlled — not swinging for momentum','Hips stay square to machine'],
  pri:['Glutes'],sec:['Hamstrings'],alts:['glute-bridge','db-hip-thrust','smith-hip-thrust']},
'db-hip-thrust':{n:'DB Hip Thrust',m:'glutes',loc:['gym'],eq:'Dumbbell + Bench',yt:null,
  steps:['Upper back on a bench, DB across hips, feet flat','Drive hips up until body forms a straight line','Lower slowly, hips just above the floor'],
  cues:['Squeeze glutes hard at the top — don\'t just go up','Chin tucked, core braced throughout','Drive through the whole foot'],
  pri:['Glutes'],sec:['Hamstrings'],alts:['smith-hip-thrust','glute-bridge']},
'smith-hip-thrust':{n:'Smith Machine Hip Thrust',m:'glutes',loc:['gym'],eq:'Smith Machine + Bench',yt:null,
  steps:['Upper back against a bench, bar over hips (pad recommended)','Drive hips up until body forms a straight line','Lower slowly, hips just above the floor'],
  cues:['Smith bar lets you load heavier than DBs','Use a pad — the bar digs in fast without one','Squeeze glutes hard at the top'],
  pri:['Glutes'],sec:['Hamstrings'],alts:['db-hip-thrust','glute-bridge']},
// ─ CALVES ─
'standing-calf-raise':{n:'Standing Calf Raise',m:'calves',loc:['home','gym'],eq:'Bodyweight / DB',yt:'8sT7Ne3Kzwc',
  steps:['Stand on edge of step if available','Rise onto tiptoes as high as possible','Lower until heel drops below step — full stretch'],
  cues:['Full range is everything — don\'t cut it short','Pause at top for extra squeeze','Calves respond great to high reps'],
  pri:['Gastrocnemius'],sec:['Soleus'],alts:['single-leg-calf-raise','bent-over-donkey-calf-raise','wall-calf-raise-hold','smith-calf-raise','db-standing-calf-raise']},
'seated-calf-raise-db':{n:'Seated Calf Raise (DB)',m:'calves',loc:['home'],eq:'Dumbbell',yt:'Ypw0dopjDJ4',
  steps:['Sit in chair, balls of feet on edge of step','DB resting on knee for resistance','Rise heels up as high as possible, lower slowly'],
  cues:['Seated hits the deeper soleus muscle differently','Press through balls of feet','Full range of motion every rep'],
  pri:['Soleus'],sec:['Gastrocnemius'],alts:['single-leg-calf-raise','bent-over-donkey-calf-raise','wall-calf-raise-hold']},
'single-leg-calf-raise':{n:'Single-Leg Calf Raise',m:'calves',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Stand on one foot on the edge of a step','Lower heel below the step for a full stretch','Rise onto toes as high as possible, lower slowly'],
  cues:['Hold a wall or rail for balance, not assistance','Full range every rep — don\'t cut it short','Switch legs when the set is done'],
  pri:['Gastrocnemius'],sec:['Soleus'],alts:['bent-over-donkey-calf-raise','wall-calf-raise-hold']},
'bent-over-donkey-calf-raise':{n:'Bent-Over Donkey Calf Raise',m:'calves',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Hinge forward, hands on a chair or counter for support','Balls of feet on a step, heels hanging off','Rise onto toes, squeeze, lower into a full stretch'],
  cues:['The forward hinge changes the angle on the calf','Keep knees soft, not locked','Slow reps — this isn\'t a bouncing movement'],
  pri:['Gastrocnemius'],sec:['Soleus'],alts:['single-leg-calf-raise','wall-calf-raise-hold']},
'wall-calf-raise-hold':{n:'Wall Calf Raise Hold',m:'calves',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Stand facing a wall, hands lightly resting for balance','Rise onto toes as high as possible','Hold the top position, then lower slowly'],
  cues:['The pause at the top is the point — don\'t rush through it','Keep weight over the balls of the feet','Great finisher after other calf work'],
  pri:['Gastrocnemius','Soleus'],sec:[],alts:['single-leg-calf-raise','bent-over-donkey-calf-raise']},
'smith-calf-raise':{n:'Smith Machine Calf Raise',m:'calves',loc:['gym'],eq:'Smith Machine',yt:null,
  steps:['Bar across upper back, balls of feet on a low block','Lower heels below the block for a full stretch','Rise onto toes as high as possible, lower slowly'],
  cues:['Smith bar lets you load heavier than bodyweight','Full range every rep — don\'t bounce','Keep knees soft, not locked'],
  pri:['Gastrocnemius'],sec:['Soleus'],alts:['db-standing-calf-raise','leg-press-calf-raise']},
'db-standing-calf-raise':{n:'DB Standing Calf Raise',m:'calves',loc:['gym'],eq:'Dumbbells',yt:null,
  steps:['Hold DBs at sides, balls of feet on a step or plate','Lower heels for a full stretch','Rise onto toes as high as possible, lower slowly'],
  cues:['Hold onto something with one hand for balance if needed','Pause and squeeze at the top','Full range beats heavier partial reps'],
  pri:['Gastrocnemius'],sec:['Soleus'],alts:['smith-calf-raise','leg-press-calf-raise']},
'leg-press-calf-raise':{n:'Leg Press Calf Raise',m:'calves',loc:['gym'],eq:'Leg Press Machine',yt:null,
  steps:['Sit in leg press, legs extended (not locked)','Place balls of feet on the bottom edge of the platform','Press through toes to extend ankles, then lower with control'],
  cues:['Only the ankles move — keep knees fixed','Full stretch at the bottom, full extension at the top','Great option if the calf/Smith setup is busy'],
  pri:['Gastrocnemius'],sec:['Soleus'],alts:['smith-calf-raise','db-standing-calf-raise']},
// ─ ABS ─
'crunch':{n:'Crunches',m:'abs',loc:['home','gym'],eq:'Bodyweight',yt:'5sQk_v8i6s8',
  steps:['Lie on back, knees bent, hands behind head or on chest','Curl upper body up — shoulder blades just off floor','Lower slowly'],
  cues:['Don\'t yank your neck','Exhale coming up, inhale down','Small controlled movement — not a full sit-up'],
  pri:['Abs'],sec:[],alts:['bicycle-crunch','lying-leg-raise','russian-twist','rotary-torso']},
'plank':{n:'Plank',m:'abs',loc:['home','gym'],eq:'Bodyweight',yt:'htqqk_uojIs',
  steps:['Forearms down, elbows under shoulders','Body in rigid straight line from head to heels','Breathe steadily, hold'],
  cues:['No sagging hips, no piking up — rigid board','Squeeze abs, glutes, and quads all at once','Build up time — even 15 seconds counts'],
  pri:['Core'],sec:['Glutes','Shoulders'],alts:['bicycle-crunch','lying-leg-raise','russian-twist','cable-crunch-kneeling']},
'bicycle-crunch':{n:'Bicycle Crunch',m:'abs',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Lie on back, hands behind head, knees up at 90°','Bring opposite elbow to opposite knee, extend other leg','Alternate in a pedaling motion'],
  cues:['Go SLOW — not a speed contest','Rotate your torso, not just your elbow','Lower back stays pressed to floor'],
  pri:['Abs','Obliques'],sec:[],alts:['lying-leg-raise','russian-twist']},
'lying-leg-raise':{n:'Lying Leg Raise',m:'abs',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Lie on back, legs straight, hands under lower back','Raise legs to vertical keeping knees soft','Lower slowly without letting feet touch down'],
  cues:['Lower back stays pressed into floor','Move slow — momentum kills the tension','Bend knees slightly if hamstrings are tight'],
  pri:['Lower Abs'],sec:['Hip Flexors'],alts:['bicycle-crunch','russian-twist']},
'russian-twist':{n:'Russian Twist',m:'abs',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Sit with knees bent, lean back slightly, lift feet if able','Rotate torso to tap the floor on one side','Rotate to the other side, repeat'],
  cues:['Move from the ribs, not just the arms','Keep chest up — don\'t collapse forward','Add a DB for more resistance once bodyweight is easy'],
  pri:['Obliques'],sec:['Abs'],alts:['bicycle-crunch','lying-leg-raise']},
'hs-abdominal-crunch':{n:'Ab Crunch (Hammer Strength)',m:'abs',loc:['gym'],eq:'Hammer Strength Machine',yt:'gK6B0kUWP_g',
  steps:['Sit in machine, grip handles or cross arms on pad','Crunch forward bringing chest toward knees','Return slowly — resist the weight on the way back'],
  cues:['Plate-loaded machine = great for weighted ab work','Slow controlled reps beat fast sloppy ones','Feel your abs throughout'],
  pri:['Abs'],sec:[],alts:['rotary-torso','weighted-situp-bench','cable-crunch-kneeling']},
'leg-knee-raises':{n:'Leg / Knee Raises',m:'abs',loc:['gym'],eq:"Captain's Chair / Mat",yt:'0AQ4j5vu2Cw',
  steps:["Grip captain's chair handles, back against pad (or lie flat on mat)",'Raise knees toward chest (or legs straight for harder version)','Lower slowly — control the descent'],
  cues:["Captain's chair version = harder and more effective",'Don\'t swing for momentum — make your abs do the work','Straight leg raises are significantly harder than knee raises'],
  pri:['Lower Abs','Hip Flexors'],sec:[],alts:['rotary-torso','weighted-situp-bench','cable-crunch-kneeling']},
'rotary-torso':{n:'Rotary Torso Machine',m:'abs',loc:['gym'],eq:'Machine',yt:null,
  steps:['Sit in machine, arms holding pads at chest level','Rotate torso to one side against resistance','Rotate back to center, repeat then switch sides'],
  cues:['Slow controlled rotation — not a quick twist','Feel the obliques working on both sides','Keep hips square — only torso rotates'],
  pri:['Obliques','Core'],sec:[],alts:['weighted-situp-bench','cable-crunch-kneeling']},
'weighted-situp-bench':{n:'Weighted Sit-Up (Flat Bench)',m:'abs',loc:['gym'],eq:'Flat Bench + DB',yt:null,
  steps:['Lie on a flat bench, feet anchored or braced, holding a DB at chest','Curl the torso up to a full sit-up','Lower slowly back down with control'],
  cues:['Hold the weight close to the chest, not overhead','Control the descent — don\'t just drop back','Start light — sit-ups load the spine more than crunches'],
  pri:['Abs'],sec:['Hip Flexors'],alts:['rotary-torso','cable-crunch-kneeling']},
'cable-crunch-kneeling':{n:'Cable Crunch (Kneeling)',m:'abs',loc:['gym'],eq:'Cable (Rope)',yt:null,
  steps:['Kneel facing a high cable with a rope attachment at your head','Crunch down, bringing elbows toward knees','Rise back up slowly, keeping tension on the abs'],
  cues:['Move from the waist, not the arms pulling down','Round the spine slightly as you crunch — don\'t just hinge hips','Constant cable tension makes this a great loaded ab move'],
  pri:['Abs'],sec:['Obliques'],alts:['rotary-torso','weighted-situp-bench']},
// ─ ADDUCTOR / ABDUCTOR ─
'adductor-machine':{n:'Hip Adductor Machine',m:'adductor',loc:['gym'],eq:'Machine',yt:'Rzj3BffTARY',
  steps:['Sit with legs open on the pads (pads on inner knees)','Squeeze legs together against resistance','Slowly open back to start'],
  cues:['High reps, controlled — not a speed exercise','Feel the inner thigh throughout','Don\'t slam legs together at center'],
  pri:['Inner Thigh (Adductors)'],sec:[],alts:[]},
'abductor-machine':{n:'Hip Abductor Machine',m:'abductor',loc:['gym'],eq:'Machine',yt:'SC8i7kGHVFk',
  steps:['Sit with legs together, pads on outer knees','Push legs apart against resistance','Slowly return to center'],
  cues:['High reps, controlled movement','Feel outer hips and glutes working','Controlled return — don\'t let weight slam'],
  pri:['Outer Hip (Abductors)','Glute Medius'],sec:[],alts:[]},
}

// ── PROGRAM ───────────────────────────────────────────────────
const PROGRAM = {
tuesday:{label:'Tuesday',short:'TUE',loc:'home',split:'upper',muscles:[
  {id:'chest',label:'Chest',slots:[{id:'db-chest-press',sets:3},{id:'db-flye',sets:3}]},
  {id:'back',label:'Back',slots:[{id:'db-row',sets:3},{id:'db-reverse-flye',sets:3}]},
  {id:'shoulders',label:'Shoulders',slots:[{id:'db-lateral-raise',sets:3},{id:'db-shoulder-press',sets:3}]},
  {id:'biceps',label:'Biceps',slots:[{id:'db-curl',sets:3},{id:'hammer-curl',sets:3}]},
  {id:'triceps',label:'Triceps',slots:[{id:'db-overhead-ext',sets:3},{id:'db-kickback',sets:3}]},
]},
thursday:{label:'Thursday',short:'THU',loc:'home',split:'lower',muscles:[
  {id:'quads',label:'Quads',slots:[{id:'goblet-squat',sets:3},{id:'db-lunge',sets:3}]},
  {id:'hamstrings',label:'Hamstrings',slots:[{id:'floor-db-leg-curl',sets:3},{id:'nordic-curl',sets:3}]},
  {id:'glutes',label:'Glutes',slots:[{id:'hip-thrust-db',sets:3},{id:'donkey-kick',sets:3}]},
  {id:'calves',label:'Calves',slots:[{id:'standing-calf-raise',sets:3},{id:'seated-calf-raise-db',sets:3}]},
  {id:'abs',label:'Abs',slots:[{id:'crunch',sets:3},{id:'plank',sets:3}]},
]},
saturday:{label:'Saturday',short:'SAT',loc:'gym',split:'upper',muscles:[
  {id:'chest',label:'Chest',slots:[{id:'hs-incline-press',sets:4},{id:'hs-chest-press',sets:4}]},
  {id:'back',label:'Back',slots:[{id:'lat-pulldown',sets:4},{id:'seated-cable-row',sets:4}]},
  {id:'shoulders',label:'Shoulders',slots:[{id:'db-lateral-raise',sets:3},{id:'shoulder-press-machine',sets:4}]},
  {id:'biceps',label:'Biceps',slots:[{id:'preacher-curl-machine',sets:3},{id:'seated-curl-machine',sets:3}]},
  {id:'triceps',label:'Triceps',slots:[{id:'cable-pushdown-rope',sets:3},{id:'cable-pushdown-reverse',sets:3}]},
]},
sunday:{label:'Sunday',short:'SUN',loc:'gym',split:'lower',muscles:[
  {id:'quads',label:'Quads',slots:[{id:'smith-squat',sets:4},{id:'leg-press-quad',sets:3},{id:'leg-extension',sets:3}]},
  {id:'hamstrings',label:'Hamstrings',slots:[{id:'lying-leg-curl',sets:4}]},
  {id:'glutes',label:'Glutes',slots:[{id:'kickback-machine',sets:4}]},
  {id:'abs',label:'Abs',slots:[{id:'hs-abdominal-crunch',sets:3},{id:'leg-knee-raises',sets:3}]},
  {id:'adductor',label:'Inner Thigh',slots:[{id:'adductor-machine',sets:2}]},
  {id:'abductor',label:'Outer Hip',slots:[{id:'abductor-machine',sets:2}]},
]},
}

// ── HELPERS ───────────────────────────────────────────────────
function getTodayDay() {
  const d = new Date().getDay()
  if (d === 2) return 'tuesday'
  if (d === 4) return 'thursday'
  if (d === 6) return 'saturday'
  if (d === 0) return 'sunday'
  return 'saturday'
}
const DAY_NUM = { tuesday:2, thursday:4, saturday:6, sunday:0 }
function dateStrForOffset(dayKey, weeksBack) {
  const targetDow = DAY_NUM[dayKey]
  const now = new Date()
  let diff = now.getDay() - targetDow
  if (diff < 0) diff += 7
  const d = new Date(now)
  d.setDate(now.getDate() - diff - weeksBack * 7)
  return d.toISOString().split('T')[0]
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
}
function getWeekRange(date) {
  const d = new Date(date)
  const dow = d.getDay()
  const diffToMonday = dow === 0 ? 6 : dow - 1
  const monday = new Date(d); monday.setDate(d.getDate() - diffToMonday)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] }
}

// ── PROGRESS CHART ───────────────────────────────────────────
const CHART_SERIES = [
  { key:'weight', label:'Weight', color:AC },
  { key:'volume', label:'Volume', color:'#D97706' },
  { key:'reps',   label:'Reps',   color:'#0891B2' },
]
function OverloadChart({ sessions }) {
  const points = sessions.map(s => {
    const validSets = (s.sets || []).filter(x => x && x.weight > 0)
    if (!validSets.length) return null
    const top = validSets.reduce((a, b) => (b.weight > a.weight ? b : a), validSets[0])
    const volume = validSets.reduce((sum, x) => sum + x.weight * x.reps, 0)
    return { date: s.date, weight: top.weight, reps: top.reps, volume }
  }).filter(Boolean)
  if (points.length < 2) return null

  const W = 300, H = 110, PAD = 8
  const stepX = (W - PAD * 2) / (points.length - 1)
  const buildCoords = (key) => {
    const vals = points.map(p => p[key])
    const min = Math.min(...vals), max = Math.max(...vals), range = (max - min) || 1
    return vals.map((v, i) => {
      const x = PAD + i * stepX
      const y = PAD + (H - PAD * 2) * (1 - (v - min) / range)
      return [x, y]
    })
  }
  return (
    <div>
      <div style={{display:'flex',gap:14,marginBottom:6}}>
        {CHART_SERIES.map(s => (
          <div key={s.key} style={{display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:8,height:8,borderRadius:4,background:s.color}}/>
            <span style={{fontSize:10,color:SB,fontWeight:600}}>{s.label}</span>
          </div>
        ))}
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{display:'block'}}>
        {CHART_SERIES.map(s => {
          const coords = buildCoords(s.key)
          const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ')
          return (
            <g key={s.key}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
              {coords.map((c, i) => <circle key={i} cx={c[0]} cy={c[1]} r={2} fill={s.color}/>)}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── OVERVIEW WIDGETS ─────────────────────────────────────────
const MUSCLE_COLORS = {
  chest:'#7C3AED', back:'#0891B2', shoulders:'#D97706', biceps:'#059669',
  triceps:'#DB2777', quads:'#4F46E5', hamstrings:'#CA8A04', glutes:'#DC2626',
  calves:'#0D9488', abs:'#EA580C', abductor:'#94A3B8', adductor:'#94A3B8',
}
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const span = Math.min(endAngle - startAngle, 359.99)
  const end = startAngle + span
  const largeArc = span > 180 ? 1 : 0
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle)
  const p2 = polarToCartesian(cx, cy, rOuter, end)
  const p3 = polarToCartesian(cx, cy, rInner, end)
  const p4 = polarToCartesian(cx, cy, rInner, startAngle)
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ')
}
function MuscleVolumeDonut({ data }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (!total) return null
  const cx = 60, cy = 60, rOuter = 56, rInner = 34
  let angle = 0
  const slices = entries.map(([m, v]) => {
    const pct = v / total, start = angle, end = angle + pct * 360
    angle = end
    return { m, v, pct, start, end, color: MUSCLE_COLORS[m] || SB }
  })
  return (
    <div style={{display:'flex',alignItems:'center',gap:16}}>
      <svg width={120} height={120} viewBox="0 0 120 120" style={{flexShrink:0}}>
        {slices.map(s => <path key={s.m} d={arcPath(cx, cy, rOuter, rInner, s.start, s.end)} fill={s.color}/>)}
      </svg>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:5,minWidth:0}}>
        {slices.map(s => (
          <div key={s.m} style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/>
            <span style={{fontSize:11,color:TX,textTransform:'capitalize',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.m}</span>
            <span style={{fontSize:11,color:SB,fontWeight:600,flexShrink:0}}>{Math.round(s.pct*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
function VolumeBarChart({ points }) {
  if (points.length < 1) return null
  const W = 300, H = 110, PAD = 4, gap = 3, LABEL_H = 16, DATE_H = 16
  const barAreaH = H - LABEL_H - DATE_H
  const max = Math.max(...points.map(p => p[1]))
  const barW = Math.min(34, (W - PAD * 2 - gap * (points.length - 1)) / points.length)
  const fmt = v => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : String(Math.round(v))
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{display:'block'}}>
      {points.map(([date, vol], i) => {
        const h = max ? (vol / max) * barAreaH : 0
        const x = PAD + i * (barW + gap)
        const y = LABEL_H + barAreaH - h
        const cx = x + barW / 2
        const dLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month:'numeric', day:'numeric' })
        return (
          <g key={date}>
            <text x={cx} y={LABEL_H - 5} textAnchor="middle" fontSize={8} fontWeight={700} fill={SB}>{fmt(vol)}</text>
            <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx={2} fill={AC}/>
            <text x={cx} y={H - 4} textAnchor="middle" fontSize={7} fill={SB}>{dLabel}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── APP ───────────────────────────────────────────────────────
export default function App() {
  const [day, setDay]             = useState(getTodayDay)
  const [muscle, setMuscle]       = useState(null)
  const [view, setView]           = useState('workout')
  const [sessionSets, setSets]    = useState({})
  const [defaults, setDefaults]   = useState({})
  const [swaps, setSwaps]         = useState({})
  const [addedEx, setAddedEx]     = useState({})
  const [hist, setHist]           = useState({})
  const [skipped, setSkipped]     = useState({})
  const [timer, setTimer]         = useState(null)
  const [modal, setModal]         = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [expandedEx, setExpandedEx] = useState(null)
  const [chartRange, setChartRange] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [weightVal, setWeightVal] = useState(0)
  const [repsVal, setRepsVal]     = useState(12)
  const [demoTab, setDemoTab]     = useState('how')
  const timerRef = useRef(null)

  useEffect(() => {
    loadData().then(({ hist: h, defaults: d, skipped: s }) => {
      if (Object.keys(h).length)     setHist(h)
      if (Object.keys(d).length)     setDefaults(d)
      if (Object.keys(s).length)     setSkipped(s)
    })
  }, [])

  useEffect(() => {
    const p = PROGRAM[day]
    if (p?.muscles?.length > 0) setMuscle(p.muscles[0].id)
  }, [day])

  useEffect(() => {
    if (modal?.type === 'demo') setDemoTab('how')
  }, [modal?.exId])

  useEffect(() => {
    if (timer && timer.secs > 0) {
      timerRef.current = setTimeout(
        () => setTimer(t => t ? { ...t, secs: t.secs - 1 } : null), 1000)
    } else if (timer && timer.secs <= 0) {
      setTimer(null)
    }
    return () => clearTimeout(timerRef.current)
  }, [timer])

  function getExId(dayKey, muscleId, slotIdx) {
    const sk = `${dayKey}_${muscleId}_${slotIdx}`
    if (swaps[sk])    return swaps[sk]
    if (defaults[sk]) return defaults[sk]
    return PROGRAM[dayKey]?.muscles?.find(m => m.id === muscleId)?.slots[slotIdx]?.id
  }
  function getLastSession(exId) {
    const s = hist[exId]; return s?.length ? s[s.length - 1] : null
  }
  function getHistSet(exId, dateStr, setIdx) {
    const sess = hist[exId]?.find(s => s.date === dateStr)
    return sess?.sets?.[setIdx] || null
  }
  async function deleteSession(exId, dateStr) {
    const { data: row } = await supabase.from('workout_data').select('data').eq('id', 'history').maybeSingle()
    const freshHist = row?.data || hist
    const sessions = (freshHist[exId] || []).filter(s => s.date !== dateStr)
    const nh = { ...freshHist, [exId]: sessions }
    setHist(nh)
    localStorage.setItem(LS_H, JSON.stringify(nh))
    try {
      await supabase.from('workout_data').upsert({ id: 'history', data: nh, updated_at: new Date().toISOString() })
    } catch { /* data already in localStorage */ }
    const todayStr = new Date().toISOString().split('T')[0]
    if (dateStr === todayStr) {
      setSets(prev => { const next = { ...prev }; delete next[exId]; return next })
    }
  }
  function startRestTimer(exId) {
    const ex = DB[exId]
    setTimer({ secs: 75, maxSecs: 75, label: ex?.n || '' })
  }
  function adjustRestTimer(secs) {
    setTimer(t => t ? { ...t, secs, maxSecs: Math.max(t.maxSecs, secs) } : null)
  }
  function unlogSet(exId, setIdx) {
    setSets(prev => {
      const cur = prev[exId] ? [...prev[exId]] : []
      if (!cur[setIdx]) return prev
      const up = [...cur]; up[setIdx] = { weight:0, reps:0, done:false }
      return { ...prev, [exId]: up }
    })
    setHist(prev => {
      const sessions = [...(prev[exId] || [])]
      const today = new Date().toISOString().split('T')[0]
      const idx = sessions.findIndex(s => s.date === today)
      if (idx < 0) return prev
      const up = [...sessions]; const sa = [...(up[idx].sets || [])]; sa[setIdx] = null
      up[idx] = { ...up[idx], sets: sa }
      const nh = { ...prev, [exId]: up }
      saveData('history', nh); return nh
    })
  }
  function logSet(exId, setIdx, weight, reps) {
    setSets(prev => {
      const numSets = DB[exId]?.sets || 4
      const cur = prev[exId] ? [...prev[exId]] : Array(numSets).fill(null).map(() => ({ weight:0,reps:0,done:false }))
      const up = [...cur]; up[setIdx] = { weight, reps, done:true }
      return { ...prev, [exId]: up }
    })
    setHist(prev => {
      const sessions = [...(prev[exId] || [])]
      const today = new Date().toISOString().split('T')[0]
      const idx = sessions.findIndex(s => s.date === today)
      let nh
      if (idx >= 0) {
        const up = [...sessions]; const sa = [...(up[idx].sets || [])]; sa[setIdx] = { weight, reps }
        up[idx] = { ...up[idx], sets: sa }; nh = { ...prev, [exId]: up }
      } else {
        const ns = Array(DB[exId]?.sets || 4).fill(null); ns[setIdx] = { weight, reps }
        nh = { ...prev, [exId]: [...sessions, { date: today, sets: ns }] }
      }
      saveData('history', nh); return nh
    })
  }
  function makeDefault(sk, exId) {
    const nd = { ...defaults, [sk]: exId }; setDefaults(nd); saveData('defaults', nd)
  }
  function addExercise(sk, exId) {
    setAddedEx(prev => {
      const cur = prev[sk] || []
      if (cur.includes(exId)) return prev
      return { ...prev, [sk]: [...cur, exId] }
    })
  }
  function removeAddedExercise(sk, exId) {
    setAddedEx(prev => ({ ...prev, [sk]: (prev[sk] || []).filter(id => id !== exId) }))
  }
  function skipDay(dateStr) {
    const ns = { ...skipped, [dateStr]: true }
    setSkipped(ns); saveData('skipped', ns)
  }
  function unskipDay(dateStr) {
    const ns = { ...skipped }; delete ns[dateStr]
    setSkipped(ns); saveData('skipped', ns)
  }

  const prog       = PROGRAM[day]
  const muscleData = prog?.muscles?.find(m => m.id === muscle)
  const shadow     = '0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.05)'
  const todayStr     = new Date().toISOString().split('T')[0]
  const isReadOnly   = weekOffset > 0
  const viewDateStr  = isReadOnly ? dateStrForOffset(day, weekOffset - 1) : todayStr

  return (
    <div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',background:BG,color:TX,fontFamily:'system-ui,-apple-system,sans-serif',overflow:'hidden'}}>

      {/* HEADER */}
      <div style={{flexShrink:0,paddingTop:12,background:BG,borderBottom:`1px solid ${BD}`}}>
        <div style={{padding:'0 16px 6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:18,fontWeight:700}}>{view==='workout'?"Emi's Workout":'Progress'}</div>
          {view==='workout'&&<div style={{display:'flex',gap:6,alignItems:'center'}}>
            <span style={{padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:600,
              background:prog?.loc==='gym'?'rgba(8,145,178,0.12)':'rgba(101,163,13,0.12)',
              color:prog?.loc==='gym'?'#0891B2':'#65A30D'}}>
              {prog?.loc==='gym'?'Gym':'Home'}
            </span>
            <span style={{fontSize:11,color:SB}}>{prog?.split} body</span>
          </div>}
        </div>
        {view==='workout'&&<div style={{padding:'4px 16px 8px',display:'flex',gap:6}}>
          {Object.entries(PROGRAM).map(([key,p])=>{
            const active=day===key
            return <button key={key} onClick={()=>{setDay(key);setSwaps({});setSets({});setWeekOffset(0);setAddedEx({})}} style={{
              flex:1,height:44,borderRadius:10,border:`1px solid ${active?AC:BD}`,cursor:'pointer',
              background:active?AC:'white',color:active?'white':SB,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',gap:1,transition:'all .15s',
              boxShadow:active?'none':'0 1px 2px rgba(0,0,0,0.06)'}}>
              <span style={{fontSize:14,fontWeight:600}}>{p.short}</span>
              <span style={{fontSize:9,opacity:.8}}>{p.loc==='gym'?'GYM':'HOME'}</span>
            </button>
          })}
        </div>}
        {view==='workout'&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px 8px',gap:8}}>
          <button onClick={()=>setWeekOffset(o=>o+1)} aria-label="Previous week" style={{
            width:30,height:30,borderRadius:8,background:'white',border:`1px solid ${BD}`,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={SB} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:13,fontWeight:600,color:isReadOnly?SB:TX}}>{isReadOnly?formatDateShort(viewDateStr):`Today · ${formatDateShort(todayStr)}`}</span>
            {isReadOnly&&<span style={{fontSize:10,fontWeight:600,color:AC,background:ACB,padding:'2px 7px',borderRadius:10}}>PAST</span>}
            {isReadOnly&&<button onClick={()=>setWeekOffset(0)} style={{background:'transparent',border:'none',cursor:'pointer',color:AC,fontSize:12,fontWeight:600,padding:0}}>Today</button>}
          </div>
          <button onClick={()=>setWeekOffset(o=>Math.max(0,o-1))} disabled={weekOffset===0} aria-label="Next week" style={{
            width:30,height:30,borderRadius:8,background:'white',border:`1px solid ${BD}`,cursor:weekOffset===0?'default':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:weekOffset===0?0.35:1}}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={SB} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>}
        {view==='workout'&&(()=>{
          const isSkipped=!!skipped[viewDateStr]
          return(
            <div style={{display:'flex',justifyContent:'center',padding:'0 16px 10px'}}>
              <button onClick={()=>isSkipped?unskipDay(viewDateStr):skipDay(viewDateStr)} style={{
                display:'flex',alignItems:'center',gap:5,background:isSkipped?'#F1F5F9':'transparent',
                border:`1px solid ${isSkipped?'#94A3B8':BD}`,borderRadius:20,padding:'4px 12px',
                cursor:'pointer',color:isSkipped?'#475569':SB,fontSize:11,fontWeight:600}}>
                {isSkipped
                  ?<><svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>Rest day — tap to undo</>
                  :<><svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={SB} strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 12h6"/></svg>Mark as rest day</>}
              </button>
            </div>
          )
        })()}
        {view==='workout'&&<div style={{display:'flex',gap:6,padding:'0 16px 10px',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          {prog?.muscles?.map(m=>{
            const active=muscle===m.id
            return <button key={m.id} onClick={()=>setMuscle(m.id)} style={{
              padding:'5px 13px',borderRadius:20,border:`1px solid ${active?AC:BD}`,flexShrink:0,
              background:active?ACB:'white',color:active?AC:SB,
              fontSize:12,fontWeight:active?600:400,cursor:'pointer',whiteSpace:'nowrap'}}>
              {m.label}
            </button>
          })}
        </div>}
      </div>

      {/* MAIN SCROLL */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px',paddingBottom:'calc(70px + env(safe-area-inset-bottom,0px))',WebkitOverflowScrolling:'touch'}}>

        {view==='workout'&&muscleData?.slots?.map((slot,slotIdx)=>{
          const sk=`${day}_${muscle}_${slotIdx}`
          const exId=getExId(day,muscle,slotIdx)
          const ex=DB[exId]
          if(!ex)return null
          const numSets=slot.sets; const exSets=sessionSets[exId]||[]; const lastSess=getLastSession(exId)
          return(
            <div key={sk} style={{marginBottom:12}}>
              {slotIdx>0&&<div style={{height:1,background:BD,margin:'0 0 12px'}}/>}
              <div style={{background:CD,borderRadius:14,padding:'12px 14px',boxShadow:shadow}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                  <div style={{flex:1,marginRight:8}}>
                    <div style={{fontSize:15,fontWeight:600,lineHeight:1.3,color:TX}}>{ex.n}</div>
                    <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                      <span style={{background:C2,padding:'2px 7px',borderRadius:5,fontSize:11,color:SB}}>{ex.eq}</span>
                      <span style={{fontSize:11,color:SB}}>{numSets} sets</span>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:5,flexShrink:0}}>
                    <button onClick={()=>setModal({type:'demo',exId})} style={{
                      width:32,height:32,borderRadius:8,background:ACB,border:`1px solid ${AC}30`,
                      cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                      aria-label="How to do this exercise">
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth={2} strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                    </button>
                    {ex.alts?.length>0&&!isReadOnly&&<button onClick={()=>setModal({type:'swap',sk,muscleId:ex.m,slotIdx,loc:prog.loc})} style={{
                      width:32,height:32,borderRadius:8,background:C2,border:`1px solid ${BD}`,
                      cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                      aria-label="Swap exercise">
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={SB} strokeWidth={2} strokeLinecap="round">
                        <path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
                      </svg>
                    </button>}
                  </div>
                </div>
                {Array.from({length:numSets},(_,si)=>{
                  const thisSet=exSets[si]||{weight:0,reps:0,done:false}
                  const lastSet=lastSess?.sets?.[si]; const done=thisSet.done
                  if (isReadOnly) {
                    const pastSet = getHistSet(exId, viewDateStr, si)
                    return(
                      <div key={si} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 0',borderTop:si>0?`1px solid ${BD}`:undefined}}>
                        <div style={{width:26,height:26,borderRadius:7,background:pastSet?.weight?AC:C2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,color:pastSet?.weight?'white':SB,flexShrink:0}}>{si+1}</div>
                        <div style={{flex:1,background:pastSet?.weight?GRB:C2,border:`1px solid ${pastSet?.weight?GR:BD}`,borderRadius:8,padding:'6px 10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontSize:13,color:pastSet?.weight?GR:SB,fontWeight:pastSet?.weight?600:400}}>
                            {pastSet?.weight?`${pastSet.weight} lbs × ${pastSet.reps} reps`:'Not logged'}
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return(
                    <div key={si} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 0',borderTop:si>0?`1px solid ${BD}`:undefined}}>
                      <div onClick={()=>startRestTimer(exId)} role="button" aria-label="Start rest timer" style={{width:26,height:26,borderRadius:7,background:done?AC:C2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,color:done?'white':SB,flexShrink:0,cursor:'pointer'}}>{si+1}</div>
                      <button onClick={()=>{
                        setWeightVal(done?thisSet.weight:(lastSet?.weight||0))
                        setRepsVal(done?thisSet.reps:(lastSet?.reps||12))
                        setModal({type:'weight',exId,setIdx:si})
                      }} style={{flex:1,background:done?GRB:C2,border:`1px solid ${done?GR:BD}`,borderRadius:8,padding:'6px 10px',cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:13,color:done?GR:SB,fontWeight:done?600:400}}>
                          {done?`${thisSet.weight} lbs × ${thisSet.reps} reps`:(lastSet?.weight?`Last: ${lastSet.weight} lbs`:'Tap to log')}
                        </span>
                        {done&&<svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={GR} strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {view==='workout'&&!isReadOnly&&muscleData&&(()=>{
          const curSk=`${day}_${muscle}`
          const addedIds=addedEx[curSk]||[]
          return(<>
            {addedIds.map(exId=>{
              const ex=DB[exId]; if(!ex)return null
              const numSets=3; const exSets=sessionSets[exId]||[]; const lastSess=getLastSession(exId)
              return(
                <div key={exId} style={{marginBottom:12}}>
                  <div style={{height:1,background:BD,margin:'0 0 12px'}}/>
                  <div style={{background:CD,borderRadius:14,padding:'12px 14px',boxShadow:shadow,border:`1px dashed ${AC}50`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div style={{flex:1,marginRight:8}}>
                        <span style={{fontSize:9,fontWeight:700,color:AC,background:ACB,padding:'1px 6px',borderRadius:8}}>ADDED</span>
                        <div style={{fontSize:15,fontWeight:600,lineHeight:1.3,color:TX,marginTop:4}}>{ex.n}</div>
                        <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                          <span style={{background:C2,padding:'2px 7px',borderRadius:5,fontSize:11,color:SB}}>{ex.eq}</span>
                          <span style={{fontSize:11,color:SB}}>{numSets} sets</span>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:5,flexShrink:0}}>
                        <button onClick={()=>setModal({type:'demo',exId})} style={{
                          width:32,height:32,borderRadius:8,background:ACB,border:`1px solid ${AC}30`,
                          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                          aria-label="How to do this exercise">
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth={2} strokeLinecap="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                        </button>
                        <button onClick={()=>removeAddedExercise(curSk,exId)} style={{
                          width:32,height:32,borderRadius:8,background:'transparent',border:`1px solid ${BD}`,
                          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                          aria-label="Remove exercise">
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={SB} strokeWidth={2} strokeLinecap="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </div>
                    </div>
                    {Array.from({length:numSets},(_,si)=>{
                      const thisSet=exSets[si]||{weight:0,reps:0,done:false}
                      const lastSet=lastSess?.sets?.[si]; const done=thisSet.done
                      return(
                        <div key={si} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 0',borderTop:si>0?`1px solid ${BD}`:undefined}}>
                          <div onClick={()=>startRestTimer(exId)} role="button" aria-label="Start rest timer" style={{width:26,height:26,borderRadius:7,background:done?AC:C2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,color:done?'white':SB,flexShrink:0,cursor:'pointer'}}>{si+1}</div>
                          <button onClick={()=>{
                            setWeightVal(done?thisSet.weight:(lastSet?.weight||0))
                            setRepsVal(done?thisSet.reps:(lastSet?.reps||12))
                            setModal({type:'weight',exId,setIdx:si})
                          }} style={{flex:1,background:done?GRB:C2,border:`1px solid ${done?GR:BD}`,borderRadius:8,padding:'6px 10px',cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <span style={{fontSize:13,color:done?GR:SB,fontWeight:done?600:400}}>
                              {done?`${thisSet.weight} lbs × ${thisSet.reps} reps`:(lastSet?.weight?`Last: ${lastSet.weight} lbs`:'Tap to log')}
                            </span>
                            {done&&<svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={GR} strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <button onClick={()=>setModal({type:'add',muscleId:muscle,loc:prog.loc})} style={{
              width:'100%',height:44,borderRadius:12,border:`1.5px dashed ${AC}60`,background:'transparent',
              color:AC,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:4,marginBottom:8}}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth={2.5} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Exercise
            </button>
          </>)
        })()}

        {view==='progress'&&(()=>{
          const exIds=Object.keys(hist).filter(id=>hist[id]?.length>0&&DB[id])
          const { start:wkStart, end:wkEnd } = getWeekRange(new Date())
          const weekDots=Object.entries(PROGRAM).map(([key,p])=>{
            const dstr=dateStrForOffset(key,0)
            const isFuture=dstr>todayStr
            const isSkipped=!!skipped[dstr]
            const slotExIds=p.muscles.flatMap(m=>m.slots.map((_,idx)=>getExId(key,m.id,idx)))
            const done=slotExIds.some(exId=>(hist[exId]||[]).some(s=>s.date>=wkStart&&s.date<=wkEnd))
            return { key, short:p.short, isFuture, done, isSkipped }
          })
          const muscleVolume={}, dailyVolume={}
          Object.entries(hist).forEach(([exId,sessions])=>{
            const ex=DB[exId]; if(!ex)return
            sessions.forEach(s=>{
              const vol=(s.sets||[]).filter(Boolean).reduce((a,x)=>a+(x.weight||0)*(x.reps||0),0)
              if(vol>0){
                muscleVolume[ex.m]=(muscleVolume[ex.m]||0)+vol
                dailyVolume[s.date]=(dailyVolume[s.date]||0)+vol
              }
            })
          })
          const dailyPoints=Object.entries(dailyVolume).sort((a,b)=>a[0]<b[0]?-1:1).slice(-14)
          if(!exIds.length)return(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:40,height:300}}>
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={BD} strokeWidth={1.5} strokeLinecap="round" style={{marginBottom:16}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <div style={{fontSize:16,fontWeight:600,textAlign:'center',marginBottom:8,color:TX}}>No workouts logged yet</div>
              <div style={{fontSize:13,color:SB,textAlign:'center'}}>Complete your first session to start tracking progress</div>
            </div>
          )
          return(<>
            {Object.keys(muscleVolume).length>0&&
              <div style={{background:CD,borderRadius:12,padding:'14px',marginBottom:14,boxShadow:shadow}}>
                <div style={{fontSize:12,color:SB,marginBottom:10}}>Volume by muscle group · all time</div>
                <MuscleVolumeDonut data={muscleVolume}/>
                {dailyPoints.length>=1&&<>
                  <div style={{fontSize:12,color:SB,margin:'16px 0 8px'}}>Total volume by day · last {dailyPoints.length}</div>
                  <VolumeBarChart points={dailyPoints}/>
                </>}
              </div>}
            <div style={{background:CD,borderRadius:12,padding:'12px 14px',marginBottom:14,boxShadow:shadow}}>
              <div style={{fontSize:12,color:SB,marginBottom:8}}>This week</div>
              <div style={{display:'flex',gap:8}}>
                {weekDots.map(d=>(
                  <div key={d.key} style={{flex:1,textAlign:'center'}}>
                    <div style={{width:'100%',height:6,borderRadius:3,background:d.done?GR:d.isSkipped?'#94A3B8':d.isFuture?C2:'#FCA5A5',marginBottom:4}}/>
                    <div style={{fontSize:10,color:d.done?GR:d.isSkipped?'#64748B':SB,fontWeight:d.done?600:400}}>{d.short}{d.isSkipped?' 💤':''}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{fontSize:12,color:SB,marginBottom:12}}>Tap an exercise for full history</div>
            {exIds.map(exId=>{
              const ex=DB[exId]; const sessions=[...hist[exId]].sort((a,b)=>a.date<b.date?-1:1)
              const last=sessions[sessions.length-1]
              const lastW=last?.sets?.find(s=>s&&s.weight>0)?.weight
              const maxWeight=Math.max(0,...sessions.flatMap(s=>(s.sets||[]).filter(Boolean).map(x=>x.weight||0)))
              const rangeStart={'4w':(()=>{const d=new Date();d.setDate(d.getDate()-28);return d.toISOString().split('T')[0]})(),
                                 '3m':(()=>{const d=new Date();d.setDate(d.getDate()-90);return d.toISOString().split('T')[0]})(),
                                 'all':'0000-00-00'}[chartRange]
              const rangedSessions=sessions.filter(s=>s.date>=rangeStart)
              const expanded=expandedEx===exId
              return(
                <div key={exId} style={{background:CD,borderRadius:12,marginBottom:8,boxShadow:shadow,overflow:'hidden'}}>
                  <div onClick={()=>{setExpandedEx(expanded?null:exId);setConfirmDelete(null)}} style={{padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:TX}}>{ex.n}</div>
                      <div style={{fontSize:11,color:SB,marginTop:2}}>{formatDateShort(last?.date)} · {sessions.length} session{sessions.length!==1?'s':''}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      {lastW&&<div style={{fontSize:15,fontWeight:700,color:AC}}>{lastW} lbs</div>}
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={SB} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{transform:expanded?'rotate(180deg)':'none',transition:'transform .15s'}}><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  {expanded&&
                    <div style={{padding:'0 14px 14px'}}>
                      <div style={{display:'flex',gap:6,marginBottom:8}}>
                        {[['4w','4 Weeks'],['3m','3 Months'],['all','All Time']].map(([k,lbl])=>(
                          <button key={k} onClick={()=>setChartRange(k)} style={{padding:'4px 12px',borderRadius:20,border:`1px solid ${chartRange===k?AC:BD}`,background:chartRange===k?ACB:'transparent',color:chartRange===k?AC:SB,fontSize:11,fontWeight:600,cursor:'pointer'}}>{lbl}</button>
                        ))}
                      </div>
                      {rangedSessions.filter(s=>(s.sets||[]).some(x=>x&&x.weight>0)).length>=2
                        ?<div style={{marginBottom:10}}><OverloadChart sessions={rangedSessions}/></div>
                        :<div style={{fontSize:11,color:SB,marginBottom:10}}>Log a couple more sessions in this range to see a trend</div>}
                      <div style={{borderTop:`1px solid ${BD}`,paddingTop:8}}>
                        {sessions.slice().reverse().map((s,i)=>{
                          const setsText=(s.sets||[]).filter(Boolean).map(x=>`${x.weight} lbs × ${x.reps}`).join('   ')
                          const isPR=maxWeight>0&&(s.sets||[]).some(x=>x&&x.weight===maxWeight)
                          const confirming=confirmDelete?.exId===exId&&confirmDelete?.date===s.date
                          return(
                            <div key={i} style={{padding:'6px 0',borderTop:i>0?`1px solid ${BD}`:undefined}}>
                              {confirming?(
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                  <span style={{fontSize:12,color:'#DC2626',fontWeight:600}}>Delete {formatDateShort(s.date)}?</span>
                                  <div style={{display:'flex',gap:6}}>
                                    <button onClick={()=>setConfirmDelete(null)} style={{fontSize:12,color:SB,background:'transparent',border:'none',cursor:'pointer',padding:'4px 8px'}}>Cancel</button>
                                    <button onClick={()=>{deleteSession(exId,s.date);setConfirmDelete(null)}} style={{fontSize:12,color:'white',background:'#DC2626',border:'none',borderRadius:6,cursor:'pointer',padding:'4px 10px',fontWeight:600}}>Delete</button>
                                  </div>
                                </div>
                              ):(
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                  <span style={{fontSize:11,color:SB,flexShrink:0,marginRight:10,display:'flex',alignItems:'center'}}>
                                    {isPR&&<span style={{fontSize:9,fontWeight:700,color:'#B45309',background:'rgba(180,83,9,0.12)',padding:'1px 5px',borderRadius:8,marginRight:6}}>PR</span>}
                                    {formatDateShort(s.date)}
                                  </span>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <span style={{fontSize:12,color:TX,fontWeight:500,textAlign:'right'}}>{setsText||'—'}</span>
                                    <button onClick={()=>setConfirmDelete({exId,date:s.date})} aria-label="Delete session" style={{background:'transparent',border:'none',cursor:'pointer',color:SB,padding:2,display:'flex',flexShrink:0}}>
                                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={SB} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>}
                </div>
              )
            })}
          </>)
        })()}
      </div>

      {/* REST TIMER */}
      {timer&&<div style={{position:'absolute',bottom:54,left:0,right:0,background:'white',borderTop:`2px solid ${AC}`,padding:'10px 16px',display:'flex',flexDirection:'column',gap:8,animation:'slideUp .3s ease-out',zIndex:20,boxShadow:'0 -2px 12px rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:SB,marginBottom:2}}>Rest — {timer.label}</div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <button onClick={()=>adjustRestTimer(Math.max(0,timer.secs-15))} style={{width:28,height:28,borderRadius:8,background:C2,border:`1px solid ${BD}`,cursor:'pointer',fontSize:16,color:TX,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>−</button>
              <div style={{fontSize:22,fontWeight:700,color:AC,fontVariantNumeric:'tabular-nums',minWidth:56,textAlign:'center'}}>
                {Math.floor(timer.secs/60)}:{String(timer.secs%60).padStart(2,'0')}
              </div>
              <button onClick={()=>adjustRestTimer(timer.secs+15)} style={{width:28,height:28,borderRadius:8,background:C2,border:`1px solid ${BD}`,cursor:'pointer',fontSize:16,color:TX,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>
            </div>
          </div>
          <button onClick={()=>setTimer(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:SB,fontSize:20,padding:4}}>✕</button>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[['1:15',75],['2:00',120],['3:00',180]].map(([lbl,secs])=>(
            <button key={secs} onClick={()=>adjustRestTimer(secs)} style={{flex:1,padding:'6px 0',borderRadius:8,border:`1px solid ${timer.secs===secs?AC:BD}`,background:timer.secs===secs?ACB:'transparent',color:timer.secs===secs?AC:SB,fontSize:12,fontWeight:600,cursor:'pointer'}}>{lbl}</button>
          ))}
        </div>
        <div style={{height:3,background:BD,borderRadius:2}}>
          <div style={{height:3,width:`${(timer.secs/timer.maxSecs)*100}%`,background:AC,borderRadius:2,transition:'width 1s linear'}}/>
        </div>
      </div>}

      {/* BOTTOM NAV */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:54,background:'white',borderTop:`1px solid ${BD}`,display:'flex',zIndex:10,paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
        {[['workout','Workout'],['progress','Progress']].map(([k,lbl])=>(
          <button key={k} onClick={()=>setView(k)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',cursor:'pointer',color:view===k?AC:SB,gap:3}}>
            {k==='workout'
              ?<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h11"/><rect x="2" y="3" width="4" height="18" rx="1"/><rect x="18" y="3" width="4" height="18" rx="1"/></svg>
              :<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            <span style={{fontSize:10,fontWeight:view===k?600:400}}>{lbl}</span>
          </button>
        ))}
      </div>

      {/* WEIGHT INPUT MODAL */}
      {modal?.type==='weight'&&(()=>{
        const {exId,setIdx}=modal; const ex=DB[exId]; const lastSet=getLastSession(exId)?.sets?.[setIdx]
        const thisSet=sessionSets[exId]?.[setIdx]
        return(
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'flex-end',zIndex:50}}
            onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
            <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:'20px 20px 36px',width:'100%',animation:'mdUp .25s ease-out',paddingBottom:'max(36px,calc(env(safe-area-inset-bottom)+24px))'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:TX}}>Set {setIdx+1} — {ex?.n}</div>
                  {lastSet?.weight
                    ?<div style={{fontSize:12,color:SB,marginTop:3}}>Last time: {lastSet.weight} lbs × {lastSet.reps} reps</div>
                    :<div style={{fontSize:12,color:AC,marginTop:3}}>First time logging this one!</div>}
                </div>
                <button onClick={()=>setModal(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:SB,fontSize:22}}>✕</button>
              </div>
              {[['Weight (lbs)',weightVal,setWeightVal,2.5,0],['Reps',repsVal,setRepsVal,1,1]].map(([lbl,val,setVal,step,min])=>(
                <div key={lbl} style={{marginBottom:14}}>
                  <div style={{fontSize:11,color:SB,marginBottom:7,textTransform:'uppercase',letterSpacing:.4}}>{lbl}</div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <button onClick={()=>setVal(v=>Math.max(min,Math.round((v-step)*10)/10))} style={{width:46,height:46,borderRadius:12,background:C2,border:`1px solid ${BD}`,cursor:'pointer',fontSize:24,color:TX,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                    <input type="number" value={val} onChange={e=>setVal(Number(e.target.value))} step={step} min={min}
                      style={{flex:1,height:46,textAlign:'center',fontSize:20,fontWeight:700,background:'white',border:`1.5px solid ${AC}`,borderRadius:12,color:TX,outline:'none'}}/>
                    <button onClick={()=>setVal(v=>Math.round((v+step)*10)/10)} style={{width:46,height:46,borderRadius:12,background:C2,border:`1px solid ${BD}`,cursor:'pointer',fontSize:24,color:TX,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                  </div>
                </div>
              ))}
              <button onClick={()=>{logSet(exId,setIdx,weightVal,repsVal);setModal(null)}} style={{width:'100%',height:52,borderRadius:14,background:AC,border:'none',cursor:'pointer',color:'white',fontSize:16,fontWeight:700}}>Log Set</button>
              {thisSet?.done&&
                <button onClick={()=>{unlogSet(exId,setIdx);setModal(null)}} style={{width:'100%',height:44,marginTop:10,borderRadius:14,background:'transparent',border:'none',cursor:'pointer',color:SB,fontSize:14,fontWeight:600}}>Unlog this set</button>}
            </div>
          </div>
        )
      })()}

      {/* DEMO MODAL */}
      {modal?.type==='demo'&&(()=>{
        const ex=DB[modal.exId]; if(!ex)return null
        return(
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'flex-end',zIndex:50}}
            onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
            <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'88%',overflow:'hidden',display:'flex',flexDirection:'column',animation:'mdUp .25s ease-out'}}>
              <div style={{padding:'16px 20px 10px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:TX}}>{ex.n}</div>
                  <div style={{fontSize:11,color:SB,marginTop:3}}>{ex.pri.join(' · ')}{ex.sec?.length>0?' + '+ex.sec.join(', '):''}</div>
                </div>
                <button onClick={()=>setModal(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:SB,fontSize:22,marginLeft:8}}>✕</button>
              </div>

              {/* VIDEO OR SEARCH BUTTON */}
              <ExerciseVideo ex={ex}/>

              <div style={{display:'flex',padding:'0 20px',gap:6,flexShrink:0,marginBottom:8}}>
                {[['how','How to'],['cues','Form cues']].map(([k,lbl])=>(
                  <button key={k} onClick={()=>setDemoTab(k)} style={{
                    padding:'5px 14px',borderRadius:20,border:`1px solid ${demoTab===k?AC:BD}`,
                    background:demoTab===k?ACB:'transparent',color:demoTab===k?AC:SB,
                    fontSize:12,fontWeight:demoTab===k?600:400,cursor:'pointer'}}>{lbl}
                  </button>
                ))}
              </div>

              <div style={{padding:'4px 20px 32px',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
                {demoTab==='how'
                  ?<ol style={{paddingLeft:18,margin:0}}>{ex.steps.map((s,i)=><li key={i} style={{color:TX,fontSize:14,marginBottom:10,lineHeight:1.6}}>{s}</li>)}</ol>
                  :<div>{ex.cues.map((c,i)=>(
                    <div key={i} style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:AC,marginTop:7,flexShrink:0}}/>
                      <div style={{color:TX,fontSize:14,lineHeight:1.6}}>{c}</div>
                    </div>
                  ))}</div>}
              </div>
            </div>
          </div>
        )
      })()}

      {/* SWAP MODAL */}
      {modal?.type==='swap'&&(()=>{
        const {sk,muscleId,slotIdx,loc}=modal
        const curExId=getExId(day,muscleId,slotIdx); const curEx=DB[curExId]; if(!curEx)return null
        const altIds=(curEx.alts||[]).filter(id=>DB[id]&&DB[id].loc.includes(loc))
        return(
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'flex-end',zIndex:50}}
            onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
            <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'80%',overflow:'hidden',display:'flex',flexDirection:'column',animation:'mdUp .25s ease-out'}}>
              <div style={{padding:'16px 20px 10px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:TX}}>Swap exercise</div>
                  <div style={{fontSize:12,color:SB,marginTop:2}}>Current: {curEx.n}</div>
                </div>
                <button onClick={()=>setModal(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:SB,fontSize:22}}>✕</button>
              </div>
              <div style={{overflowY:'auto',padding:'0 20px 32px',WebkitOverflowScrolling:'touch'}}>
                {altIds.length===0
                  ?<div style={{color:SB,fontSize:13,textAlign:'center',padding:'24px 0'}}>No alternatives for this location.</div>
                  :altIds.map(exId=>{
                    const ex=DB[exId]
                    return(
                      <div key={exId} style={{background:C2,borderRadius:12,padding:'12px 14px',marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:14,fontWeight:600,color:TX}}>{ex.n}</div>
                            <div style={{fontSize:11,color:SB,marginTop:2}}>{ex.eq} · {ex.pri.join(', ')}</div>
                          </div>
                          <button onClick={()=>setModal({type:'demo',exId})} style={{background:'transparent',border:'none',cursor:'pointer',color:SB,padding:2}}>
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={SB} strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                          </button>
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <button onClick={()=>{setSwaps(p=>({...p,[sk]:exId}));setModal(null)}} style={{flex:1,height:36,borderRadius:10,border:`1px solid ${BD}`,background:'white',cursor:'pointer',color:TX,fontSize:13,fontWeight:500}}>Use today</button>
                          <button onClick={()=>{makeDefault(sk,exId);setModal(null)}} style={{flex:1,height:36,borderRadius:10,border:`1px solid ${AC}`,background:ACB,cursor:'pointer',color:AC,fontSize:13,fontWeight:500}}>Make default</button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )
      })()}

      {modal?.type==='add'&&(()=>{
        const {muscleId,loc}=modal
        const curSk=`${day}_${muscleId}`
        const onScreenIds=new Set([
          ...(muscleData?.slots?.map((_,idx)=>getExId(day,muscleId,idx))||[]),
          ...(addedEx[curSk]||[])
        ])
        const options=Object.keys(DB).filter(id=>DB[id].m===muscleId&&DB[id].loc.includes(loc)&&!onScreenIds.has(id))
        return(
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'flex-end',zIndex:50}}
            onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
            <div style={{background:'white',borderRadius:'20px 20px 0 0',width:'100%',maxHeight:'80%',overflow:'hidden',display:'flex',flexDirection:'column',animation:'mdUp .25s ease-out'}}>
              <div style={{padding:'16px 20px 10px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:TX}}>Add exercise</div>
                  <div style={{fontSize:12,color:SB,marginTop:2}}>{muscleData?.label} · {loc==='gym'?'Gym':'Home'} · today only</div>
                </div>
                <button onClick={()=>setModal(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:SB,fontSize:22}}>✕</button>
              </div>
              <div style={{overflowY:'auto',padding:'0 20px 32px',WebkitOverflowScrolling:'touch'}}>
                {options.length===0
                  ?<div style={{color:SB,fontSize:13,textAlign:'center',padding:'24px 0'}}>Every {loc} exercise for this muscle is already on today's list.</div>
                  :options.map(exId=>{
                    const ex=DB[exId]
                    return(
                      <div key={exId} style={{background:C2,borderRadius:12,padding:'12px 14px',marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:14,fontWeight:600,color:TX}}>{ex.n}</div>
                            <div style={{fontSize:11,color:SB,marginTop:2}}>{ex.eq} · {ex.pri.join(', ')}</div>
                          </div>
                          <button onClick={()=>setModal({type:'demo',exId})} style={{background:'transparent',border:'none',cursor:'pointer',color:SB,padding:2}}>
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={SB} strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                          </button>
                        </div>
                        <button onClick={()=>{addExercise(curSk,exId);setModal(null)}} style={{width:'100%',height:36,borderRadius:10,border:`1px solid ${AC}`,background:ACB,cursor:'pointer',color:AC,fontSize:13,fontWeight:500}}>Add to today</button>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

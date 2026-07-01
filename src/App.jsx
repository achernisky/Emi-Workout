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

async function loadData() {
  try {
    const { data, error } = await supabase
      .from('workout_data')
      .select('id, data')
      .in('id', ['history', 'defaults'])
    if (error) throw error
    const result = { hist: {}, defaults: {} }
    data?.forEach(row => {
      if (row.id === 'history')  result.hist     = row.data || {}
      if (row.id === 'defaults') result.defaults = row.data || {}
    })
    if (Object.keys(result.hist).length)     localStorage.setItem(LS_H, JSON.stringify(result.hist))
    if (Object.keys(result.defaults).length) localStorage.setItem(LS_D, JSON.stringify(result.defaults))
    return result
  } catch {
    return {
      hist:     JSON.parse(localStorage.getItem(LS_H) || '{}'),
      defaults: JSON.parse(localStorage.getItem(LS_D) || '{}'),
    }
  }
}

async function saveData(key, val) {
  localStorage.setItem(key === 'history' ? LS_H : LS_D, JSON.stringify(val))
  try {
    await supabase.from('workout_data').upsert({
      id: key, data: val, updated_at: new Date().toISOString(),
    })
  } catch { /* data already in localStorage */ }
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
'db-chest-press':{n:'DB Chest Press',m:'chest',loc:['home'],eq:'Dumbbells',yt:null,
  steps:['Lie on back, DB each hand at chest, elbows at 90°','Press up to near-full extension','Lower 2 seconds — controlled descent'],
  cues:['Elbows at 45°, not flared wide','Core tight throughout','Slow lowering is where growth happens'],
  pri:['Chest'],sec:['Triceps','Shoulder'],alts:['push-up','db-flye']},
'db-flye':{n:'DB Chest Flye',m:'chest',loc:['home'],eq:'Dumbbells',yt:null,
  steps:['Lie on back, DBs above chest, slight elbow bend','Arc arms wide until you feel a chest stretch','Squeeze chest to bring arms back up'],
  cues:['Keep the slight elbow bend — never lock straight','Think: hugging a big tree','Feel the stretch at the bottom'],
  pri:['Chest'],sec:['Shoulder'],alts:['push-up','db-chest-press']},
'push-up':{n:'Push-Up',m:'chest',loc:['home','gym'],eq:'Bodyweight',yt:null,
  steps:['High plank, hands slightly wider than shoulders','Lower chest toward floor, elbows at 45°','Push back up'],
  cues:['Straight line from head to heels','Exhale on the push up','Drop to knees if needed'],
  pri:['Chest'],sec:['Triceps','Core'],alts:['db-chest-press','db-flye']},
'hs-incline-press':{n:'Incline Press (Hammer Strength)',m:'chest',loc:['gym'],eq:'Hammer Strength',yt:'i3e4CG5tnfs',
  steps:['Adjust seat so handles are at upper chest height','Press forward-upward until arms nearly extended','Lower slowly — 2 seconds controlled'],
  cues:['Upper chest focus — feel it at the top of your pecs','Machine guides the path — still squeeze the chest','Don\'t lock elbows at full extension'],
  pri:['Upper Chest'],sec:['Triceps','Shoulder'],alts:['hs-chest-press','pec-deck','cable-chest-fly']},
'hs-chest-press':{n:'Chest Press (Hammer Strength)',m:'chest',loc:['gym'],eq:'Hammer Strength',yt:null,
  steps:['Adjust seat so handles are at mid-chest height','Press forward until arms nearly extended','Lower slowly with control'],
  cues:['Keep lower back against the pad','Don\'t lock elbows at the end','2-second controlled return'],
  pri:['Chest'],sec:['Triceps','Shoulder'],alts:['hs-incline-press','pec-deck','assisted-dip']},
'pec-deck':{n:'Pec Deck (Chest Fly)',m:'chest',loc:['gym'],eq:'Machine',yt:null,
  steps:['Sit with back flat on pad, elbows on the arm pads','Bring arms together — squeeze chest hard','Open slowly back to stretch position'],
  cues:['Squeeze hard at center — that\'s the key','Don\'t let weights slam on the return','Keep slight elbow bend throughout'],
  pri:['Chest'],sec:['Shoulder'],alts:['hs-chest-press','cable-chest-fly']},
'assisted-dip':{n:'Assisted Dip Machine',m:'chest',loc:['gym'],eq:'Machine',yt:null,
  steps:['Set assistance weight (higher = easier)','Grip handles, lower until elbows at 90°','Press back up to full extension'],
  cues:['Lean slightly forward for chest focus','Full range of motion every rep','Decrease assistance over time'],
  pri:['Chest','Triceps'],sec:['Shoulder'],alts:['hs-chest-press','cable-chest-fly']},
'cable-chest-fly':{n:'Cable Chest Fly',m:'chest',loc:['gym'],eq:'Cable (Matrix)',yt:null,
  steps:['Cables at shoulder height, step forward slightly','Arc handles together in front of chest','Open slowly maintaining constant cable tension'],
  cues:['Slight elbow bend — never lock straight','Think: hugging someone','Cable keeps tension at bottom = great stretch'],
  pri:['Chest'],sec:['Shoulder'],alts:['pec-deck','hs-chest-press']},
// ─ BACK ─
'db-row':{n:'Dumbbell Row',m:'back',loc:['home','gym'],eq:'Dumbbell',yt:null,
  steps:['One hand + knee on surface for support','DB in other hand, arm hanging','Pull to hip, driving elbow past your back','Lower slowly'],
  cues:['Drive the elbow back — not just the hand up','Back flat throughout','Squeeze your back at the top'],
  pri:['Lats','Rhomboids'],sec:['Biceps','Rear Shoulder'],alts:['db-reverse-flye']},
'db-reverse-flye':{n:'DB Reverse Flye',m:'back',loc:['home','gym'],eq:'Dumbbells',yt:null,
  steps:['Hinge forward at hips, back flat, DBs hanging','Raise both arms out to sides like wings','Squeeze shoulder blades together at top, lower slowly'],
  cues:['Think: squeezing a pencil between shoulder blades','Light weight only — this is a detail move','Maintain the forward lean throughout'],
  pri:['Rear Deltoid','Rhomboids'],sec:['Traps'],alts:['db-row','superman']},
'superman':{n:'Superman Hold',m:'back',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Lie face down, arms extended in front','Lift arms and legs simultaneously','Hold 2 seconds at top, lower slowly'],
  cues:['Squeeze glutes and lower back at top','Look at the floor — don\'t crane neck','Even small lifts are effective'],
  pri:['Lower Back','Glutes'],sec:['Hamstrings'],alts:['db-row','db-reverse-flye']},
'lat-pulldown':{n:'Lat Pulldown',m:'back',loc:['gym'],eq:'Cable Machine',yt:'jULa7guhCdM',
  steps:['Lock thighs under pad, wide grip on bar, lean back slightly','Pull bar to upper chest driving elbows down and back','Let bar rise slowly — full stretch at top'],
  cues:['Lead with elbows — not your hands','Chest up and open throughout','No swinging or yanking'],
  pri:['Lats'],sec:['Biceps','Rhomboids'],alts:['rev-grip-pulldown','seated-cable-row','assisted-pull-up','back-extension']},
'seated-cable-row':{n:'Seated Cable Row',m:'back',loc:['gym'],eq:'Cable Machine',yt:'8QuMq1GMMng',
  steps:['Sit at cable row, feet on platform, back straight','Pull handle to lower chest, squeezing shoulder blades','Return slowly — let cable stretch you forward'],
  cues:['Don\'t round your back reaching forward','At the pull: elbows behind body, chest proud','Control the return — don\'t get yanked forward'],
  pri:['Lats','Rhomboids'],sec:['Biceps','Rear Shoulder'],alts:['lat-pulldown','underhand-bent-row','back-extension']},
'rev-grip-pulldown':{n:'Reverse Grip Pulldown',m:'back',loc:['gym'],eq:'Hammer Strength / Cable',yt:null,
  steps:['Grip bar with palms facing you (underhand), shoulder-width','Pull down to upper chest, elbows driving close to sides','Lower slowly with full stretch at top'],
  cues:['Underhand grip hits lower lats + biceps more','Elbows stay closer to body than regular pulldown','Full stretch at top every rep'],
  pri:['Lats (Lower)','Biceps'],sec:['Rhomboids'],alts:['lat-pulldown','seated-cable-row']},
'underhand-bent-row':{n:'Underhand Bent-Over Row',m:'back',loc:['gym'],eq:'Smith Machine / Cable (Straight Bar)',yt:null,
  steps:['Bar at hip height, grip with palms facing UP (underhand)','Slight forward lean, feet shoulder-width','Pull bar to waist level, driving elbows back','Lower slowly'],
  cues:['Palms up = underhand/supinated grip throughout','Less forward lean than a standard row — more upright','Hits lower lats and involves biceps more than overhand'],
  pri:['Lats (Lower)','Rhomboids'],sec:['Biceps'],alts:['seated-cable-row','lat-pulldown']},
'back-extension':{n:'Back Extension Machine',m:'back',loc:['gym'],eq:'Machine',yt:null,
  steps:['Position hips at pad edge, feet secured','Cross arms on chest or hold weight','Hinge forward at hips, then extend back to neutral'],
  cues:['Don\'t hyperextend past neutral at the top','Use lower back and glutes to come up','Slow controlled — not a momentum swing'],
  pri:['Lower Back'],sec:['Glutes','Hamstrings'],alts:['lat-pulldown','seated-cable-row']},
'assisted-pull-up':{n:'Assisted Pull-Up Machine',m:'back',loc:['gym'],eq:'Machine',yt:null,
  steps:['Set assistance weight (higher = easier)','Kneel on pad, wide grip, palms facing away','Pull until chin clears handles, lower slowly'],
  cues:['Machine counterbalances your bodyweight','Focus on pulling elbows down and back','Decrease assistance over time'],
  pri:['Lats'],sec:['Biceps'],alts:['lat-pulldown','rev-grip-pulldown']},
// ─ SHOULDERS ─
'db-shoulder-press':{n:'DB Shoulder Press',m:'shoulders',loc:['home','gym'],eq:'Dumbbells',yt:null,
  steps:['DBs at shoulder height, elbows at 90°','Press overhead to near-full extension','Lower back to shoulder height slowly'],
  cues:['Core tight — don\'t lean back','Stop just short of locking elbows','Wrists stay straight'],
  pri:['Front & Side Deltoid'],sec:['Triceps'],alts:['arnold-press','db-lateral-raise']},
'db-lateral-raise':{n:'DB Lateral Raise',m:'shoulders',loc:['home','gym'],eq:'Dumbbells',yt:'JIhbYYA1Q90',
  steps:['Stand with light DBs at sides','Raise both arms out — stop at shoulder height','Lower very slowly — 3 seconds down'],
  cues:['Lead with elbows, not your wrists','LIGHT weight — less than you think','Don\'t go above shoulder height'],
  pri:['Side Deltoid'],sec:['Front Deltoid'],alts:['shoulder-press-machine','cable-upright-row']},
'shoulder-press-machine':{n:'Shoulder Press Machine',m:'shoulders',loc:['gym'],eq:'Machine',yt:'_ae_7jJqJQ0',
  steps:['Adjust seat, handles at shoulder height','Press overhead to near-full extension','Lower back to shoulder height slowly'],
  cues:['Head stays against headrest','Core engaged — don\'t arch back','Smooth press, controlled return'],
  pri:['Front & Side Deltoid'],sec:['Triceps'],alts:['db-shoulder-press','db-lateral-raise']},
'cable-upright-row':{n:'Cable Upright Row',m:'shoulders',loc:['gym'],eq:'Cable (Straight Bar)',yt:null,
  steps:['Stand at cable machine, straight bar attached low','Pull bar up to chin level, elbows flaring out to sides','Lower slowly with control'],
  cues:['Elbows lead — always higher than wrists','Don\'t pull above chin level','Hits front + side delts and upper traps'],
  pri:['Front & Side Deltoid','Traps'],sec:[],alts:['db-lateral-raise','face-pull']},
'face-pull':{n:'Face Pull (Rope)',m:'shoulders',loc:['gym'],eq:'Cable (Rope)',yt:null,
  steps:['Cable at head height, rope attachment','Pull rope toward your face, elbows flaring out high','Squeeze shoulder blades at the end'],
  cues:['Elbows stay HIGH — at ear level','External rotation at end: thumbs pointing back','Great for shoulder health, rear delts, and posture'],
  pri:['Rear Deltoid','External Rotators'],sec:['Traps'],alts:['db-lateral-raise','cable-upright-row']},
'arnold-press':{n:'Arnold Press',m:'shoulders',loc:['home','gym'],eq:'Dumbbells',yt:null,
  steps:['Start with DBs at chin, palms facing you','Rotate palms outward as you press up','At top palms face forward — reverse on way down'],
  cues:['Smooth rotation throughout','Hits all three deltoid heads','Named after the governor — it works'],
  pri:['All Deltoid Heads'],sec:['Triceps'],alts:['db-shoulder-press','db-lateral-raise']},
// ─ BICEPS ─
'db-curl':{n:'Dumbbell Curl',m:'biceps',loc:['home','gym'],eq:'Dumbbells',yt:'MKWBV29S6c0',
  steps:['Stand, DBs at sides palms forward','Curl both to shoulders, elbows at sides','Lower slowly — all the way down'],
  cues:['Elbows stay glued to sides','Squeeze at the top','Slow descent = more growth'],
  pri:['Biceps'],sec:['Forearms'],alts:['hammer-curl','concentration-curl']},
'hammer-curl':{n:'Hammer Curl',m:'biceps',loc:['home','gym'],eq:'Dumbbells',yt:'NyW2fT2gQhM',
  steps:['DBs at sides, palms facing each other (thumbs up)','Curl up keeping palms facing each other','Lower slowly'],
  cues:['Neutral grip hits outer bicep + forearm more','Elbows stay at sides','Can alternate or do both at once'],
  pri:['Biceps','Brachialis'],sec:['Forearms'],alts:['db-curl','rotating-hammer-curl']},
'preacher-curl-machine':{n:'Preacher Curl Machine',m:'biceps',loc:['gym'],eq:'Machine',yt:'Htw-s61mOw0',
  steps:['Sit facing machine, rest upper arms on the angled pad in front','Curl handles toward face','Lower slowly to full extension — feel the stretch'],
  cues:['Pad locks elbows in front — no cheating possible','Full stretch at the bottom is the key','Squeeze hard at the top'],
  pri:['Biceps (Short Head)'],sec:[],alts:['seated-curl-machine','db-curl','cable-curl']},
'seated-curl-machine':{n:'Seated Bicep Curl Machine',m:'biceps',loc:['gym'],eq:'Machine',yt:'XFAYzZgcbSc',
  steps:['Sit with pad behind upper arms, arms hang at sides','Curl handles toward shoulders','Lower to full stretch'],
  cues:['Pad behind the arm = great stretch on the long head','Don\'t rush — controlled throughout','Feel the full stretch at the bottom'],
  pri:['Biceps (Long Head)'],sec:[],alts:['preacher-curl-machine','db-curl']},
'concentration-curl':{n:'Concentration Curl',m:'biceps',loc:['home','gym'],eq:'Dumbbell',yt:null,
  steps:['Sit on end of bench, lean forward slightly','Brace elbow on inner thigh, DB hanging','Curl up toward face, squeeze at top, lower all the way'],
  cues:['Elbow on leg = zero cheating possible','Hold and squeeze at the top for 1 second','Great for bicep peak'],
  pri:['Biceps'],sec:[],alts:['db-curl','hammer-curl']},
'seated-db-concentration':{n:'Seated DB Curl (Between Legs)',m:'biceps',loc:['gym'],eq:'Dumbbell',yt:null,
  steps:['Sit at end of bench, hold DB with both hands between knees','Curl up toward chin with both hands','Lower slowly, full stretch at bottom'],
  cues:['Two-handed grip = more stability','Works biceps with slightly different angle','Keep back straight throughout'],
  pri:['Biceps'],sec:['Forearms'],alts:['concentration-curl','db-curl']},
'rotating-hammer-curl':{n:'Rotating Hammer Curl',m:'biceps',loc:['home','gym'],eq:'Dumbbells',yt:null,
  steps:['Start like a hammer curl (palms in, thumbs up)','As you curl up, rotate palm toward ceiling at the top','Lower reversing the rotation'],
  cues:['The rotation at top fully contracts the bicep','Smooth rotation — don\'t jerk it','Also called Zottman curl'],
  pri:['Biceps','Brachialis'],sec:['Forearms'],alts:['hammer-curl','db-curl']},
'cable-curl':{n:'Cable Curl (V-Bar)',m:'biceps',loc:['gym'],eq:'Cable (V-Bar)',yt:null,
  steps:['Cable at low position, V-bar attachment','Step back slightly, curl up toward chin','Lower slowly with constant cable tension'],
  cues:['V-bar = neutral grip for outer bicep','Cable keeps tension at bottom = advantage over DBs','Elbows stay at sides'],
  pri:['Biceps','Brachialis'],sec:['Forearms'],alts:['preacher-curl-machine','db-curl']},
// ─ TRICEPS ─
'db-overhead-ext':{n:'DB Overhead Extension',m:'triceps',loc:['home','gym'],eq:'Dumbbell',yt:null,
  steps:['Hold one DB with both hands overhead','Lower it behind head by bending elbows','Press back up until arms straight'],
  cues:['Keep elbows pointing forward — don\'t flare','Upper arms stay still — only forearms move','Great stretch at the bottom'],
  pri:['Triceps (Long Head)'],sec:[],alts:['db-kickback','close-grip-push-up']},
'db-kickback':{n:'Tricep Kickback',m:'triceps',loc:['home','gym'],eq:'Dumbbell',yt:null,
  steps:['Hinge forward, upper arm parallel to floor','Extend forearm back until arm fully straight','Lower forearm slowly'],
  cues:['Upper arm STAYS parallel to floor — this is everything','Squeeze at full extension','Light weight, perfect form'],
  pri:['Triceps'],sec:[],alts:['db-overhead-ext','close-grip-push-up']},
'close-grip-push-up':{n:'Close-Grip Push-Up',m:'triceps',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Push-up position, hands directly under shoulders','Lower keeping elbows close to body','Push back up'],
  cues:['Elbows graze your sides on the way down','More tricep than regular push-up','Drop to knees if needed'],
  pri:['Triceps'],sec:['Chest'],alts:['db-overhead-ext','db-kickback']},
'cable-pushdown-rope':{n:'Cable Pushdown (Rope)',m:'triceps',loc:['gym'],eq:'Cable (Rope)',yt:'aHfbuBf1TJk',
  steps:['Cable up high with rope attachment','Elbows tucked at sides, start at 90°','Push down flaring rope apart at bottom, squeeze','Return slowly to 90°'],
  cues:['Elbows don\'t move — they\'re the pivot','Flare rope apart at the bottom for extra squeeze','Don\'t lean too far forward'],
  pri:['Triceps'],sec:[],alts:['cable-pushdown-reverse','overhead-cable-ext','skull-crushers']},
'cable-pushdown-reverse':{n:'Cable Pushdown (Reverse Grip)',m:'triceps',loc:['gym'],eq:'Cable (Curl Bar)',yt:null,
  steps:['Cable up high, EZ-curl bar, palms facing DOWN (overhand grip)','Elbows tucked at sides, push bar down','Return slowly'],
  cues:['Overhand/reverse grip shifts emphasis to the lateral tricep head','Same pivot-point concept as regular pushdown','Elbows stay at sides throughout'],
  pri:['Triceps (Lateral Head)'],sec:['Forearms'],alts:['cable-pushdown-rope','overhead-cable-ext']},
'overhead-cable-ext':{n:'Overhead Cable Extension',m:'triceps',loc:['gym'],eq:'Cable (Curl Bar)',yt:null,
  steps:['Cable at low position, EZ curl bar attachment','Stand facing away, hold bar overhead, elbows bent','Extend arms forward-upward overhead, then lower slowly'],
  cues:['Excellent long head stretch','Keep elbows pointed up — don\'t flare out','Step away from cable for proper tension'],
  pri:['Triceps (Long Head)'],sec:[],alts:['cable-pushdown-rope','skull-crushers']},
'skull-crushers':{n:'Skull Crushers',m:'triceps',loc:['gym'],eq:'EZ Bar (Curl Bar)',yt:null,
  steps:['Lie on bench, EZ bar extended overhead','Lower bar toward forehead by bending only elbows','Press back up to full extension'],
  cues:['Only the elbows bend — upper arms stay vertical','Use the EZ-curl bar from the rack','Squeeze at full extension each rep'],
  pri:['Triceps (Long Head)'],sec:[],alts:['overhead-cable-ext','cable-pushdown-rope']},
'one-arm-cable-pushdown':{n:'Single-Arm Cable Pushdown',m:'triceps',loc:['gym'],eq:'Cable (No Attachment)',yt:null,
  steps:['Hold the cable clip/ball directly (no attachment)','Elbow tucked at side, push down to full extension','Return slowly, repeat then switch arms'],
  cues:['Single arm = better isolation, no cheating with other side','Hold the cable end directly — fully valid technique','Squeeze at full extension each rep'],
  pri:['Triceps'],sec:[],alts:['cable-pushdown-rope','cable-pushdown-reverse']},
// ─ QUADS ─
'goblet-squat':{n:'Goblet Squat',m:'quads',loc:['home'],eq:'Dumbbell',yt:'eLX_dyvooKQ',
  steps:['Hold one DB vertically at chest','Feet shoulder-width, toes slightly out','Squat until thighs parallel, drive up through heels'],
  cues:['Chest stays up — no rounding forward','Knees track over toes','Push knees out as you lower'],
  pri:['Quadriceps'],sec:['Glutes','Core'],alts:['db-lunge','sumo-squat']},
'db-lunge':{n:'Dumbbell Lunge',m:'quads',loc:['home','gym'],eq:'Dumbbells',yt:null,
  steps:['DBs at sides, stand tall','Step forward, lower back knee toward floor','Push off front foot to return, alternate legs'],
  cues:['Front knee stays behind toes — big enough step','Torso stays upright','Balance is part of this exercise'],
  pri:['Quadriceps'],sec:['Glutes','Hamstrings'],alts:['goblet-squat','sumo-squat']},
'sumo-squat':{n:'Sumo Squat',m:'quads',loc:['home'],eq:'Dumbbell',yt:null,
  steps:['Feet wider than shoulder-width, toes out','Hold DB between legs','Squat down chest up, drive through heels'],
  cues:['Wide stance = more inner thigh + glutes','Knees push out in line with toes','Keep DB from touching floor'],
  pri:['Quadriceps','Inner Thigh'],sec:['Glutes'],alts:['goblet-squat','db-lunge']},
'smith-squat':{n:'Smith Machine Squat',m:'quads',loc:['gym'],eq:'Smith Machine',yt:'fC5urG2CCr8',
  steps:['Bar across upper back, feet shoulder-width','Squat until thighs parallel','Drive up through heels'],
  cues:['Smith guides bar path — still maintain form','Drive knees outward over toes','Chest up throughout'],
  pri:['Quadriceps'],sec:['Glutes','Hamstrings'],alts:['db-lunge']},
'leg-press-quad':{n:'Leg Press — Quad Focus',m:'quads',loc:['gym'],eq:'Leg Press Machine',yt:'nDh_BlnLCGc',
  steps:['Feet close together and LOW on the platform','Lower until knees near 90°','Press back up — never lock knees'],
  cues:['Close, low foot placement = outer quad emphasis','Don\'t let lower back peel off seat at bottom','Never fully lock knees at extension'],
  pri:['Outer Quadriceps'],sec:['Quads'],alts:['smith-squat','leg-extension']},
'leg-extension':{n:'Leg Extension Machine',m:'quads',loc:['gym'],eq:'Machine',yt:'iQ92TuvBqRo',
  steps:['Sit, ankles under roller pad','Extend legs until nearly straight — squeeze quads hard at top','Lower slowly — 2-3 seconds down'],
  cues:['Full extension at top — really squeeze','Slow descent is critical','Adjust ankle pad just above your shoes'],
  pri:['Quadriceps'],sec:[],alts:['smith-squat','leg-press-quad']},
// ─ HAMSTRINGS ─
'floor-db-leg-curl':{n:'Floor DB Leg Curl',m:'hamstrings',loc:['home'],eq:'Dumbbell',yt:null,
  steps:['Lie face down, hold DB between ankles','Curl heels toward glutes','Lower slowly — full stretch at bottom'],
  cues:['Keep hips pressed to floor throughout','Start light — DB between feet takes practice','Slow controlled movement'],
  pri:['Hamstrings'],sec:['Glutes'],alts:['nordic-curl']},
'nordic-curl':{n:'Nordic Curl',m:'hamstrings',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Kneel on mat, anchor feet under couch or heavy furniture','Slowly lower torso toward floor, hips straight','Catch yourself with hands at bottom, push back up'],
  cues:['Lower AS SLOWLY AS POSSIBLE — the eccentric is everything','Using your hands to push back up is completely fine','One of the best hamstring exercises in existence'],
  pri:['Hamstrings'],sec:['Glutes'],alts:['floor-db-leg-curl']},
'lying-leg-curl':{n:'Prone Leg Curl',m:'hamstrings',loc:['gym'],eq:'Machine',yt:'WKFzO6U6lE4',
  steps:['Lie face down, ankle pads above heels','Curl heels toward glutes as far as possible','Lower slowly — full stretch at bottom'],
  cues:['Best machine position for hamstrings — prefer over seated','Hips stay pressed to pad — don\'t let them lift','Squeeze at top of each rep'],
  pri:['Hamstrings'],sec:['Calves'],alts:['seated-leg-curl','leg-press-glute-ham']},
'seated-leg-curl':{n:'Seated Leg Curl',m:'hamstrings',loc:['gym'],eq:'Machine',yt:null,
  steps:['Sit with back against pad, ankles over roller pad','Pull heels down and back toward seat','Return slowly to start'],
  cues:['Use when prone machine is taken','Slightly different stretch angle — still very effective','Control the return all the way up'],
  pri:['Hamstrings'],sec:[],alts:['lying-leg-curl','leg-press-glute-ham']},
'leg-press-glute-ham':{n:'Leg Press — Glute / Ham Focus',m:'hamstrings',loc:['gym'],eq:'Leg Press Machine',yt:null,
  steps:['Feet WIDE and HIGH on the platform','Lower platform deep for maximum hip flexion','Press back up'],
  cues:['Wide, high placement = hamstrings and glutes take over','Go deeper than you would for quad-focused leg press','Never lock knees at the top'],
  pri:['Hamstrings','Glutes'],sec:[],alts:['lying-leg-curl','seated-leg-curl']},
// ─ GLUTES ─
'hip-thrust-db':{n:'Hip Thrust (DB)',m:'glutes',loc:['home'],eq:'DB + Couch/Chair',yt:'fv6EfDZ0E28',
  steps:['Upper back on edge of couch, DB across hips','Drive hips up until body is in a straight line','Lower slowly, hips just above floor'],
  cues:['SQUEEZE glutes at the top — don\'t just go up','Chin tucked, core braced','Drive through the whole foot, not just heels'],
  pri:['Glutes'],sec:['Hamstrings'],alts:['glute-bridge','donkey-kick']},
'glute-bridge':{n:'Glute Bridge',m:'glutes',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Lie on back, knees bent, feet flat','Drive hips up squeezing glutes, hold 1-2 sec','Lower slowly'],
  cues:['Add DB on hips when bodyweight gets easy','Full squeeze at top every rep','Great hamstring loading too'],
  pri:['Glutes','Hamstrings'],sec:[],alts:['hip-thrust-db','donkey-kick']},
'donkey-kick':{n:'Donkey Kick',m:'glutes',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['On hands and knees','Keep knee bent at 90°, kick one leg up and back','Squeeze glute at top, lower, repeat then switch'],
  cues:['Hips stay SQUARE — don\'t rotate','It\'s about the glute squeeze, not the height','Add ankle weights when bodyweight gets easy'],
  pri:['Glutes'],sec:['Hamstrings'],alts:['hip-thrust-db','glute-bridge']},
'kickback-machine':{n:'Glute Kickback Machine',m:'glutes',loc:['gym'],eq:'Machine',yt:'3fBptAH0Rnw',
  steps:['Stand at machine, chest against front pad','Working foot on platform, kick back to full extension','Squeeze glute at top, return slowly'],
  cues:['Full extension + squeeze every single rep','Controlled — not swinging for momentum','Hips stay square to machine'],
  pri:['Glutes'],sec:['Hamstrings'],alts:['cable-kickback']},
'cable-kickback':{n:'Cable Kickback',m:'glutes',loc:['gym'],eq:'Cable',yt:null,
  steps:['Cable at low position, ankle strap on','Face machine, kick leg straight back','Squeeze at top, controlled return'],
  cues:['Constant cable tension throughout = advantage over bodyweight','Slight forward lean is fine','Slow beats heavy + sloppy'],
  pri:['Glutes'],sec:['Hamstrings'],alts:['kickback-machine']},
// ─ CALVES ─
'standing-calf-raise':{n:'Standing Calf Raise',m:'calves',loc:['home','gym'],eq:'Bodyweight / DB',yt:null,
  steps:['Stand on edge of step if available','Rise onto tiptoes as high as possible','Lower until heel drops below step — full stretch'],
  cues:['Full range is everything — don\'t cut it short','Pause at top for extra squeeze','Calves respond great to high reps'],
  pri:['Gastrocnemius'],sec:['Soleus'],alts:['seated-calf-raise-db']},
'seated-calf-raise-db':{n:'Seated Calf Raise (DB)',m:'calves',loc:['home'],eq:'Dumbbell',yt:null,
  steps:['Sit in chair, balls of feet on edge of step','DB resting on knee for resistance','Rise heels up as high as possible, lower slowly'],
  cues:['Seated hits the deeper soleus muscle differently','Press through balls of feet','Full range of motion every rep'],
  pri:['Soleus'],sec:['Gastrocnemius'],alts:['standing-calf-raise']},
// ─ ABS ─
'crunch':{n:'Crunches',m:'abs',loc:['home','gym'],eq:'Bodyweight',yt:null,
  steps:['Lie on back, knees bent, hands behind head or on chest','Curl upper body up — shoulder blades just off floor','Lower slowly'],
  cues:['Don\'t yank your neck','Exhale coming up, inhale down','Small controlled movement — not a full sit-up'],
  pri:['Abs'],sec:[],alts:['bicycle-crunch','plank']},
'plank':{n:'Plank',m:'abs',loc:['home','gym'],eq:'Bodyweight',yt:null,
  steps:['Forearms down, elbows under shoulders','Body in rigid straight line from head to heels','Breathe steadily, hold'],
  cues:['No sagging hips, no piking up — rigid board','Squeeze abs, glutes, and quads all at once','Build up time — even 15 seconds counts'],
  pri:['Core'],sec:['Glutes','Shoulders'],alts:['crunch','bicycle-crunch']},
'bicycle-crunch':{n:'Bicycle Crunch',m:'abs',loc:['home'],eq:'Bodyweight',yt:null,
  steps:['Lie on back, hands behind head, knees up at 90°','Bring opposite elbow to opposite knee, extend other leg','Alternate in a pedaling motion'],
  cues:['Go SLOW — not a speed contest','Rotate your torso, not just your elbow','Lower back stays pressed to floor'],
  pri:['Abs','Obliques'],sec:[],alts:['crunch','plank']},
'hs-abdominal-crunch':{n:'Ab Crunch (Hammer Strength)',m:'abs',loc:['gym'],eq:'Hammer Strength Machine',yt:null,
  steps:['Sit in machine, grip handles or cross arms on pad','Crunch forward bringing chest toward knees','Return slowly — resist the weight on the way back'],
  cues:['Plate-loaded machine = great for weighted ab work','Slow controlled reps beat fast sloppy ones','Feel your abs throughout'],
  pri:['Abs'],sec:[],alts:['leg-knee-raises','rotary-torso']},
'leg-knee-raises':{n:'Leg / Knee Raises',m:'abs',loc:['gym'],eq:"Captain's Chair / Mat",yt:null,
  steps:["Grip captain's chair handles, back against pad (or lie flat on mat)",'Raise knees toward chest (or legs straight for harder version)','Lower slowly — control the descent'],
  cues:["Captain's chair version = harder and more effective",'Don\'t swing for momentum — make your abs do the work','Straight leg raises are significantly harder than knee raises'],
  pri:['Lower Abs','Hip Flexors'],sec:[],alts:['hs-abdominal-crunch','rotary-torso']},
'rotary-torso':{n:'Rotary Torso Machine',m:'abs',loc:['gym'],eq:'Machine',yt:null,
  steps:['Sit in machine, arms holding pads at chest level','Rotate torso to one side against resistance','Rotate back to center, repeat then switch sides'],
  cues:['Slow controlled rotation — not a quick twist','Feel the obliques working on both sides','Keep hips square — only torso rotates'],
  pri:['Obliques','Core'],sec:[],alts:['hs-abdominal-crunch','leg-knee-raises']},
// ─ ADDUCTOR / ABDUCTOR ─
'adductor-machine':{n:'Hip Adductor Machine',m:'adductor',loc:['gym'],eq:'Machine',yt:'Rzj3BffTARY',
  steps:['Sit with legs open on the pads (pads on inner knees)','Squeeze legs together against resistance','Slowly open back to start'],
  cues:['High reps, controlled — not a speed exercise','Feel the inner thigh throughout','Don\'t slam legs together at center'],
  pri:['Inner Thigh (Adductors)'],sec:[],alts:[]},
'abductor-machine':{n:'Hip Abductor Machine',m:'abductor',loc:['gym'],eq:'Machine',yt:null,
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

// ── APP ───────────────────────────────────────────────────────
export default function App() {
  const [day, setDay]             = useState(getTodayDay)
  const [muscle, setMuscle]       = useState(null)
  const [view, setView]           = useState('workout')
  const [sessionSets, setSets]    = useState({})
  const [defaults, setDefaults]   = useState({})
  const [swaps, setSwaps]         = useState({})
  const [hist, setHist]           = useState({})
  const [timer, setTimer]         = useState(null)
  const [modal, setModal]         = useState(null)
  const [weightVal, setWeightVal] = useState(0)
  const [repsVal, setRepsVal]     = useState(12)
  const [demoTab, setDemoTab]     = useState('how')
  const timerRef = useRef(null)

  useEffect(() => {
    loadData().then(({ hist: h, defaults: d }) => {
      if (Object.keys(h).length)     setHist(h)
      if (Object.keys(d).length)     setDefaults(d)
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
  function logSet(exId, setIdx, weight, reps) {
    setSets(prev => {
      const numSets = DB[exId]?.sets || 4
      const cur = prev[exId] ? [...prev[exId]] : Array(numSets).fill(null).map(() => ({ weight:0,reps:0,done:false }))
      const up = [...cur]; up[setIdx] = { weight, reps, done:true }
      return { ...prev, [exId]: up }
    })
    const ex = DB[exId]
    const isCompound = ['quads','hamstrings','glutes','back','chest'].includes(ex?.m)
    setTimer({ secs: isCompound ? 75 : 60, maxSecs: isCompound ? 75 : 60, label: ex?.n || '' })
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

  const prog       = PROGRAM[day]
  const muscleData = prog?.muscles?.find(m => m.id === muscle)
  const shadow     = '0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.05)'

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
            return <button key={key} onClick={()=>{setDay(key);setSwaps({});setSets({})}} style={{
              flex:1,height:44,borderRadius:10,border:`1px solid ${active?AC:BD}`,cursor:'pointer',
              background:active?AC:'white',color:active?'white':SB,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',gap:1,transition:'all .15s',
              boxShadow:active?'none':'0 1px 2px rgba(0,0,0,0.06)'}}>
              <span style={{fontSize:14,fontWeight:600}}>{p.short}</span>
              <span style={{fontSize:9,opacity:.8}}>{p.loc==='gym'?'GYM':'HOME'}</span>
            </button>
          })}
        </div>}
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
                    {ex.alts?.length>0&&<button onClick={()=>setModal({type:'swap',sk,muscleId:ex.m,slotIdx,loc:prog.loc})} style={{
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
                  return(
                    <div key={si} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 0',borderTop:si>0?`1px solid ${BD}`:undefined}}>
                      <div style={{width:26,height:26,borderRadius:7,background:done?AC:C2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,color:done?'white':SB,flexShrink:0}}>{si+1}</div>
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

        {view==='progress'&&(()=>{
          const exIds=Object.keys(hist).filter(id=>hist[id]?.length>0&&DB[id])
          if(!exIds.length)return(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:40,height:300}}>
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={BD} strokeWidth={1.5} strokeLinecap="round" style={{marginBottom:16}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <div style={{fontSize:16,fontWeight:600,textAlign:'center',marginBottom:8,color:TX}}>No workouts logged yet</div>
              <div style={{fontSize:13,color:SB,textAlign:'center'}}>Complete your first session to start tracking progress</div>
            </div>
          )
          return(<>
            <div style={{fontSize:12,color:SB,marginBottom:12}}>Last logged weight per exercise</div>
            {exIds.map(exId=>{
              const ex=DB[exId]; const sessions=hist[exId]; const last=sessions[sessions.length-1]
              const lastW=last?.sets?.find(s=>s&&s.weight>0)?.weight
              return(
                <div key={exId} style={{background:CD,borderRadius:12,padding:'10px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:shadow}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:TX}}>{ex.n}</div>
                    <div style={{fontSize:11,color:SB,marginTop:2}}>{last?.date} · {sessions.length} session{sessions.length!==1?'s':''}</div>
                  </div>
                  {lastW&&<div style={{fontSize:15,fontWeight:700,color:AC}}>{lastW} lbs</div>}
                </div>
              )
            })}
          </>)
        })()}
      </div>

      {/* REST TIMER */}
      {timer&&<div style={{position:'absolute',bottom:54,left:0,right:0,background:'white',borderTop:`2px solid ${AC}`,padding:'10px 16px',display:'flex',gap:12,alignItems:'center',animation:'slideUp .3s ease-out',zIndex:20,boxShadow:'0 -2px 12px rgba(0,0,0,0.08)'}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:SB,marginBottom:2}}>Rest — {timer.label}</div>
          <div style={{fontSize:22,fontWeight:700,color:AC,fontVariantNumeric:'tabular-nums'}}>
            {Math.floor(timer.secs/60)}:{String(timer.secs%60).padStart(2,'0')}
          </div>
          <div style={{height:3,background:BD,borderRadius:2,marginTop:4}}>
            <div style={{height:3,width:`${(timer.secs/timer.maxSecs)*100}%`,background:AC,borderRadius:2,transition:'width 1s linear'}}/>
          </div>
        </div>
        <button onClick={()=>setTimer(null)} style={{background:'transparent',border:'none',cursor:'pointer',color:SB,fontSize:20,padding:4}}>✕</button>
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
    </div>
  )
}

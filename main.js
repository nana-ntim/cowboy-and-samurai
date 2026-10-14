/* The Cowboy and Samurai: motion and interaction.
   Lenis for the scroll, GSAP + ScrollTrigger for what moves with it, SplitText for the titles.
   The one big moment is the hero: a blade line splits Cowboy from Samurai and follows you.
   Anyone with "reduce motion" on gets the same page, still and immediate. */
(() => {
  const $ = (s, el = document) => el.querySelector(s)
  const $$ = (s, el = document) => [...el.querySelectorAll(s)]
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
  const lerp = (a, b, t) => a + (b - a) * t
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
  const phone = matchMedia('(max-width: 760px), (max-aspect-ratio: 4/5)') // the hero's versus-card layout
  if (reduced) document.documentElement.classList.add('reduced')

  gsap.registerPlugin(ScrollTrigger, SplitText)
  gsap.defaults({ ease: 'expo.out', duration: 1.2 })

  /* ---------- open or closed, right now (Accra is on GMT all year) ---------- */

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  function openState() {
    const now = new Date()
    const day = now.getUTCDay()
    const mins = now.getUTCHours() * 60 + now.getUTCMinutes()
    const OPEN = 11 * 60, CLOSE = 19 * 60
    if (day !== 1 && mins >= OPEN && mins < CLOSE) {
      const left = CLOSE - mins
      return { day, open: true, tiny: 'Open now', short: left <= 60 ? `Open now, last orders before 7pm` : 'Open now until 7pm', long: 'Open now. We close at 7pm.' }
    }
    if (day !== 1 && mins < OPEN) return { day, open: false, tiny: 'Opens at 11am', short: 'Opens today at 11am', long: 'Opens today at 11am.' }
    if (day === 1) return { day, open: false, tiny: 'Closed today', short: 'Closed Mondays. Back tomorrow at 11am', long: 'Closed today, as every Monday. Back tomorrow at 11am.' }
    // after closing: back tomorrow, except on Sunday night, when tomorrow is Monday
    const sunday = day === 0
    return { day, open: false, tiny: 'Closed now', short: `Closed now. Back ${sunday ? 'Tuesday' : 'tomorrow'} at 11am`, long: `Closed for the day. Back ${sunday ? 'on Tuesday' : 'tomorrow'} at 11am.` }
  }
  function paintStatus() {
    const s = openState()
    $$('[data-status]').forEach((el) => { el.textContent = 'tiny' in el.dataset && phone.matches ? s.tiny : s.short; el.classList.toggle('is-open', s.open); el.style.setProperty('--dot', s.open ? 'var(--open)' : 'var(--shut)') })
    $$('[data-status-long]').forEach((el) => { el.textContent = s.long; el.classList.add('status'); el.classList.toggle('is-open', s.open); el.style.setProperty('--dot', s.open ? 'var(--open)' : 'var(--shut)') })
    $$('.week li').forEach((li) => li.classList.toggle('is-today', Number(li.dataset.day) === s.day))
  }
  paintStatus()
  setInterval(paintStatus, 60000)

  /* ---------- smooth scroll ---------- */

  let lenis = null
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, touchMultiplier: 1.15 })
    window.__lenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((t) => lenis.raf(t * 1000))
    gsap.ticker.lagSmoothing(0)
  }
  const navH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 76
  function scrollToEl(el) {
    if (!el) return
    const offset = el.id === 'top' ? 0 : navH() - 1
    if (lenis) lenis.scrollTo(el, { offset: -offset, duration: 1.6, force: true, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete: () => { if (Math.abs(el.getBoundingClientRect().top - offset) > 4) lenis.scrollTo(el, { offset: -offset, duration: 0.6 }) } })
    else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - offset, behavior: reduced ? 'auto' : 'smooth' })
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]')
    if (!a) return
    const el = document.getElementById(a.getAttribute('href').slice(1))
    if (!el) return
    e.preventDefault()
    closeSheet()
    scrollToEl(el)
    history.replaceState(null, '', a.getAttribute('href') === '#top' ? location.pathname : a.getAttribute('href'))
  })

  /* ---------- nav: hides on the way down, comes back on the way up ---------- */

  const nav = $('[data-nav]')
  const hero = $('[data-hero]')
  let lastY = 0
  function onScroll() {
    const y = scrollY
    const past = y > hero.offsetHeight * 0.9
    if (past && y > lastY + 2 && !sheetOpen) nav.classList.add('is-hidden')
    if (y < lastY - 2 || !past) nav.classList.remove('is-hidden')
    lastY = y
  }
  if (lenis) lenis.on('scroll', onScroll); else addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  /* ---------- the phone menu ---------- */

  const sheet = $('[data-sheet]')
  const toggle = $('[data-toggle]')
  let sheetOpen = false
  function openSheet() { sheetOpen = true; sheet.hidden = false; toggle.setAttribute('aria-expanded', 'true'); nav.classList.remove('is-hidden'); lenis?.stop(); if (!reduced) gsap.from(sheet.querySelectorAll('nav a'), { yPercent: 60, opacity: 0, stagger: 0.05, duration: 0.9 }) }
  function closeSheet() { if (!sheetOpen) return; sheetOpen = false; sheet.hidden = true; toggle.setAttribute('aria-expanded', 'false'); lenis?.start(); onScroll() }
  toggle.addEventListener('click', () => (sheetOpen ? closeSheet() : openSheet()))
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet() })

  /* ---------- order dialog ---------- */

  const dialog = $('[data-order-dialog]')
  const teamLine = $('[data-order-team]')
  $$('[data-order]').forEach((b) => b.addEventListener('click', () => {
    closeSheet()
    const t = team()
    teamLine.hidden = !t
    if (t) teamLine.textContent = t === 'cowboy' ? 'Team Cowboy: ask for The Cowboy.' : 'Team Samurai: ask for The Samurai.'
    dialog.showModal()
    lenis?.stop()
  }))
  $('[data-order-close]').addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close() })
  dialog.addEventListener('close', () => lenis?.start())

  /* ---------- team ---------- */

  const KEY = 'cs-team'
  const team = () => { try { return localStorage.getItem(KEY) } catch { return null } }
  function paintTeam(t) {
    $$('[data-team-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.teamBtn === t)))
    const q = $('[data-pick-q]')
    q.textContent = t === 'cowboy' ? 'Team Cowboy it is.' : t === 'samurai' ? 'Team Samurai it is.' : 'Team Cowboy or Team Samurai?'
    $$('.dish[data-team]').forEach((d) => {
      const mine = !!t && d.dataset.team === t
      d.classList.toggle('is-mine', mine)
      $('.dish-tag', d).textContent = mine ? 'Your pick' : (d.dataset.team === 'cowboy' ? 'Team Cowboy' : 'Team Samurai')
    })
  }
  paintTeam(team())

  /* ---------- hero: the standoff ---------- */

  const sideC = $('.side--cowboy', hero)
  const sideS = $('.side--samurai', hero)
  const handC = $('.side-hand', sideC)
  const handS = $('.side-hand', sideS)
  const lines = $$('.seam line', hero)
  const tag = $('[data-cursor-tag]')
  const st = { c: 0.5, t: 0.5, over: false, px: 0, py: 0, tx: 0, ty: 0, hold: 0, visible: true }

  // Where the cut sits: the centre c plus a slant (top edge a, bottom edge b, as fractions of the width).
  // Desktop keeps c near the middle. Phones show one side at a time: c = 1.25 is all Cowboy, -0.25 all Samurai.
  const SLANT = () => (phone.matches ? 0.12 : 0.04)
  const FULL = { cowboy: 1.25, samurai: -0.25 }
  function seamAt(c) { const s = SLANT(); return { a: c + s, b: c - s } }
  function sideAt(x, y) {
    const r = hero.getBoundingClientRect()
    const { a, b } = seamAt(st.c)
    const fy = (y - r.top) / r.height
    return (x - r.left) / r.width < lerp(a, b, fy) ? 'cowboy' : 'samurai'
  }

  function paintSeam() {
    const { a, b } = seamAt(st.c)
    hero.style.setProperty('--a', (a * 100).toFixed(3) + '%')
    hero.style.setProperty('--b', (b * 100).toFixed(3) + '%')
    const lc = phone.matches ? 0 : clamp((st.c - 0.5) / 0.12, 0, 1), ls = phone.matches ? 0 : clamp((0.5 - st.c) / 0.12, 0, 1)
    hero.style.setProperty('--lift-c', lc.toFixed(4))
    hero.style.setProperty('--lift-s', ls.toFixed(4))
    lines.forEach((l) => { l.setAttribute('x1', a * 100 + '%'); l.setAttribute('y1', '0'); l.setAttribute('x2', b * 100 + '%'); l.setAttribute('y2', '100%') })
    const y = phone.matches ? 0.5 : 0.29
    hero.style.setProperty('--and-x', (lerp(a, b, y) * 100).toFixed(3) + '%')
    hero.style.setProperty('--and-y', y * 100 + '%')
  }

  function pick(t, from) {
    try { localStorage.setItem(KEY, t) } catch {}
    paintTeam(t)
    if (phone.matches) { mob.show(t); return }
    st.t = t === 'cowboy' ? 0.62 : 0.38
    st.hold = performance.now() + 1500
    hero.classList.remove('is-picked'); void hero.offsetWidth; hero.classList.add('is-picked')
    if (!reduced && from !== 'load') gsap.fromTo(t === 'cowboy' ? handC : handS, { '--rise': 0 }, { '--rise': -4, duration: 0.35, ease: 'power2.out', yoyo: true, repeat: 1 })
  }
  $$('[data-team-btn]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); pick(b.dataset.teamBtn) }))
  hero.addEventListener('click', (e) => {
    if (e.target.closest('a, button') || hero.dataset.dragged) return
    pick(sideAt(e.clientX, e.clientY))
  })

  if (fine) {
    hero.addEventListener('pointermove', (e) => {
      st.over = true
      const r = hero.getBoundingClientRect()
      st.px = e.clientX - r.left; st.py = e.clientY - r.top
      const fx = st.px / r.width
      // the side you lean into gains ground
      if (performance.now() > st.hold) st.t = clamp(0.5 + (0.5 - fx) * 0.4, 0.38, 0.62)
      const side = sideAt(e.clientX, e.clientY)
      const overUi = !!e.target.closest('a, button')
      hero.classList.toggle('has-cursor', !overUi)
      tag.textContent = team() === side ? 'Your team' : side === 'cowboy' ? 'Team Cowboy' : 'Team Samurai'
      tag.style.color = side === 'cowboy' ? 'var(--red)' : 'var(--blue)'
    })
    hero.addEventListener('pointerleave', () => { st.over = false; hero.classList.remove('has-cursor') })
  }

  new IntersectionObserver(([e]) => { st.visible = e.isIntersecting }).observe(hero)

  // Phones: the blade sweeps between the two sides on its own, a finger can drag it, a tap picks.
  const mob = {
    c: FULL.cowboy, tl: null, drag: null, resumeAt: 0,
    sweep(to, d = 1.05) { return gsap.to(mob, { c: FULL[to], duration: reduced ? 0 : d, ease: 'power3.inOut', overwrite: true }) },
    auto() {
      mob.tl?.kill()
      if (reduced || team()) return
      mob.tl = gsap.timeline({ repeat: -1, delay: 2.4 })
        .to(mob, { c: FULL.samurai, duration: 1.05, ease: 'power3.inOut' })
        .to(mob, { c: FULL.cowboy, duration: 1.05, ease: 'power3.inOut' }, '+=2.6')
        .to({}, { duration: 2.6 })
    },
    show(t) { mob.tl?.kill(); mob.sweep(t) },
  }
  hero.addEventListener('pointerdown', (e) => {
    if (!phone.matches || e.pointerType === 'mouse' || e.target.closest('a, button')) return
    mob.drag = { x: e.clientX, y: e.clientY, c: mob.c, on: false }
  })
  hero.addEventListener('pointermove', (e) => {
    const d = mob.drag
    if (!d) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (!d.on && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { d.on = true; mob.tl?.pause(); gsap.killTweensOf(mob) }
    if (d.on) mob.c = clamp(d.c + (dx / hero.clientWidth) * 1.6, FULL.samurai, FULL.cowboy)
  })
  const endDrag = (e) => {
    const d = mob.drag
    mob.drag = null
    if (!d?.on) return
    hero.dataset.dragged = '1'
    setTimeout(() => delete hero.dataset.dragged, 60)
    mob.sweep(e.clientX - d.x < 0 ? 'samurai' : 'cowboy', 0.7)
    if (!team()) { mob.tl?.kill(); setTimeout(() => { if (!mob.drag) mob.auto() }, 5000) }
  }
  hero.addEventListener('pointerup', endDrag)
  hero.addEventListener('pointercancel', endDrag)

  function heroTick(time) {
    if (!st.visible) return
    if (phone.matches) { st.c = mob.c; paintSeam(); return }
    if (!st.over && performance.now() > st.hold) {
      const t = team()
      const base = t === 'cowboy' ? 0.56 : t === 'samurai' ? 0.44 : 0.5
      st.t = reduced ? base : base + Math.sin(time * 0.55) * 0.022
    }
    st.c = lerp(st.c, st.t, reduced ? 1 : 0.075)
    paintSeam()
    if (fine && st.over) {
      st.tx = lerp(st.tx, st.px, 0.22); st.ty = lerp(st.ty, st.py, 0.22)
      tag.style.transform = `translate3d(${st.tx + 18}px, ${st.ty + 20}px, 0)`
    }
  }
  if (reduced) { paintSeam() } else gsap.ticker.add(heroTick)

  // Manga focus lines (shuchusen) behind each burger, drawn for the current size.
  function focusLines() {
    $$('[data-lines]', hero).forEach((svg) => {
      const side = svg.closest('.side')
      const hand = $('.side-hand', side)
      const W = hero.clientWidth, H = hero.clientHeight
      const hr = hand.getBoundingClientRect(), r = hero.getBoundingClientRect()
      const isC = side.classList.contains('side--cowboy')
      const cx = hr.left - r.left + hr.width * (isC ? 0.42 : 0.34)
      const cy = hr.top - r.top + hr.height * (isC ? 0.16 : 0.14)
      const inner = Math.min(W, H) * (phone.matches ? 0.2 : 0.24)
      const outer = Math.hypot(W, H)
      let d = ''
      let seed = isC ? 7 : 13
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
      for (let i = 0; i < 150; i++) {
        const ang = rnd() * Math.PI * 2
        const spread = 0.004 + rnd() * 0.012
        const r0 = inner * (1 + rnd() * 0.9)
        const p = (a, rad) => `${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`
        d += `M${p(ang - spread, outer)}L${p(ang + spread, outer)}L${p(ang, r0)}Z`
      }
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
      svg.innerHTML = `<path fill="currentColor" d="${d}"/>`
    })
  }

  /* ---------- the opening cut ---------- */

  const intro = $('[data-intro]')
  const seen = document.documentElement.classList.contains('seen')
  const names = $$('.side-name, .side-jp, .side-desc', hero)
  const heroUi = $$('.bill, .seam', hero)

  function heroIn(delay = 0) {
    if (reduced) return
    const tl = gsap.timeline({ delay })
    tl.fromTo([handC, handS], { '--rise': 38 }, { '--rise': 0, duration: 1.6, stagger: 0.08, ease: 'expo.out' }, 0)
    tl.from($$('.side-name', hero), { yPercent: 40, opacity: 0, duration: 1.4, stagger: 0.06 }, 0.1)
    tl.from($$('.side-jp, .side-desc', hero), { opacity: 0, y: 16, duration: 1.2, stagger: 0.04 }, 0.4)
    tl.from(heroUi, { opacity: 0, duration: 1, stagger: 0.08, ease: 'power2.out' }, 0.55)
    tl.from(nav, { opacity: 0, y: -12, duration: 1 }, 0.5)
    return tl
  }

  function runIntro() {
    const halves = $$('.intro-half', intro)
    const blade = $('.intro-blade', intro)
    const marks = $$('.intro-mark', intro)
    lenis?.stop()
    // the blade follows the same line as the cut: from 54% along the top to 46% along the bottom
    intro.style.setProperty('--blade', (Math.atan2(0.08 * innerWidth, innerHeight) * 180 / Math.PI).toFixed(2) + 'deg')
    gsap.set(blade, { xPercent: -50, yPercent: -50, rotation: Math.atan2(0.08 * innerWidth, innerHeight) * 180 / Math.PI, scaleY: 0 })
    gsap.set([handC, handS], { '--rise': 38 })
    const tl = gsap.timeline({ onComplete: () => { intro.remove(); lenis?.start(); try { sessionStorage.setItem('cs-intro', '1') } catch {} } })
    tl.from(marks, { scale: 0.88, opacity: 0, duration: 0.9, ease: 'expo.out' }, 0.1)
    tl.to(blade, { scaleY: 1, duration: 0.42, ease: 'power4.inOut' }, 0.7)
    tl.to(blade, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 1.1)
    tl.to(halves[0], { xPercent: -62, yPercent: 4, duration: 1.15, ease: 'expo.inOut' }, 1.08)
    tl.to(halves[1], { xPercent: 62, yPercent: -4, duration: 1.15, ease: 'expo.inOut' }, 1.08)
    tl.add(heroIn(), 1.45)
  }

  /* ---------- titles take their stance: Archivo's width opens from 62 to 100 ---------- */

  function stances() {
    $$('.stance').forEach((el) => {
      SplitText.create(el, {
        type: 'lines', linesClass: 'line', autoSplit: true,
        onSplit(self) {
          return gsap.fromTo(self.lines, { '--w': 62, opacity: 0, yPercent: 30 }, {
            '--w': 100, opacity: 1, yPercent: 0, duration: 1.5, stagger: 0.09, ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 86%', once: true },
          })
        },
      })
    })
  }

  /* ---------- Yaa Asantewaa: the spec sheet draws itself ---------- */

  function spec() {
    // Labels sit in the dark margins either side of the photo; lines run to the layer they name.
    // data-at is a point on the photo (fractions of its width and height); data-y is the label's height on the photo.
    const fig = $('[data-spec]')
    const svg = $('[data-spec-lines]')
    const img = $('img', fig)
    const items = $$('.spec-labels li', fig)
    let tl = null
    function draw() {
      const F = fig.getBoundingClientRect(), I = img.getBoundingClientRect()
      const ix = I.left - F.left, iy = I.top - F.top
      const gap = Math.max(14, I.width * 0.04)
      svg.setAttribute('viewBox', `0 0 ${F.width} ${F.height}`)
      svg.setAttribute('preserveAspectRatio', 'none')
      let out = ''
      items.forEach((li) => {
        const [ax, ay] = li.dataset.at.split(',').map(Number)
        const ly = iy + Number(li.dataset.y) * I.height
        const right = li.dataset.side === 'r'
        const lx = right ? ix + I.width + gap : ix - gap
        const tx0 = ix + ax * I.width, ty0 = iy + ay * I.height
        // phones: no room in the margins, so each label sits on the layer it names
        if (phone.matches) { li.style.setProperty('--lx', tx0 + 'px'); li.style.setProperty('--ly', ty0 + 'px'); return }
        li.style.setProperty('--lx', lx + 'px'); li.style.setProperty('--ly', ly + 'px')
        const sx = right ? lx - 8 : lx + 8
        const tx = ix + ax * I.width, ty = iy + ay * I.height
        out += `<line x1="${sx}" y1="${ly}" x2="${tx}" y2="${ty}"/><circle cx="${tx}" cy="${ty}" r="4.5"/>`
      })
      svg.innerHTML = out
      fig.classList.add('is-drawn')
    }
    function animate() {
      tl?.scrollTrigger?.kill(); tl?.kill()
      if (reduced) return
      const ls = $$('line', svg), dots = $$('circle', svg)
      ls.forEach((l) => { const len = Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value); l.style.strokeDasharray = len; l.style.strokeDashoffset = len })
      tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 70%', end: 'center 50%', scrub: 0.6 } })
      if (phone.matches) { items.forEach((li, i) => tl.fromTo(li, { opacity: 0 }, { opacity: 1, duration: 0.4 }, i * 0.15)); return }
      items.forEach((li, i) => {
        tl.fromTo(li, { opacity: 0, x: li.dataset.side === 'r' ? 20 : -20 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, i * 0.18)
        tl.to(ls[i], { strokeDashoffset: 0, duration: 0.5, ease: 'none' }, i * 0.18 + 0.1)
        tl.fromTo(dots[i], { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.25, ease: 'back.out(3)' }, i * 0.18 + 0.5)
      })
    }
    const go = () => { draw(); animate() }
    img.complete ? go() : img.addEventListener('load', () => { go(); ScrollTrigger.refresh() })
    let t
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(go, 150) })
  }

  /* ---------- videos play only while seen ---------- */

  const vio = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target
    if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; if (!reduced) v.play().catch(() => {}) } else v.pause()
  }), { rootMargin: '200px 0px' })
  $$('video[data-autoplay]').forEach((v) => vio.observe(v))

  /* ---------- events reel drifts sideways as you pass (phones swipe it) ---------- */

  function reel() {
    const el = $('[data-reel]')
    ScrollTrigger.matchMedia({
      '(min-width: 761px)': () => {
        const tw = gsap.fromTo(el, { x: 0 }, {
          x: () => Math.min(0, innerWidth - el.scrollWidth), ease: 'none',
          scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: 0.8, invalidateOnRefresh: true },
        })
        return () => tw.kill()
      },
    })
  }

  /* ---------- hero scroll-out: the hands lower ---------- */

  function heroOut() {
    gsap.to([handC, handS], { '--sink': 22, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
    // y, not yPercent: the intro animates yPercent, and two tweens on one property fight
    gsap.fromTo($$('.side-name', hero), { y: 0 }, { y: (i, el) => -el.offsetHeight * 0.35, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } })
  }

  /* ---------- footer: the lockup fills the width; the mark tips its hat ---------- */

  const lockup = $('[data-lockup]')
  function fitLockup() {
    const line = lockup.querySelector('span')
    lockup.style.setProperty('--fit', '100px')
    const w = line.getBoundingClientRect().width
    const avail = lockup.clientWidth * 0.98
    lockup.style.setProperty('--fit', ((100 * avail) / w).toFixed(2) + 'px')
  }
  const hat = $('[data-hat-tip]')
  ScrollTrigger.create({ trigger: hat, start: 'top 80%', onEnter: () => { hat.classList.add('tip'); setTimeout(() => hat.classList.remove('tip'), 1400) } })

  /* ---------- go ---------- */

  const t0 = team()
  if (t0) { st.c = st.t = t0 === 'cowboy' ? 0.56 : 0.44; mob.c = FULL[t0] }
  if (phone.matches) st.c = mob.c
  paintSeam()
  mob.auto()

  function layout() { fitLockup(); focusLines() }
  document.fonts.ready.then(() => {
    layout()
    if (!reduced) {
      stances()
      heroOut()
      reel()
    }
    spec()
    ScrollTrigger.refresh()
  })
  handC.complete ? focusLines() : handC.addEventListener('load', focusLines)
  handS.addEventListener('load', focusLines)
  let rz
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); paintSeam() }, 120) })
  phone.addEventListener('change', () => { if (phone.matches) { st.c = mob.c; mob.auto() } else { mob.tl?.kill(); st.c = st.t = 0.5 } paintSeam(); focusLines(); paintStatus() })

  if (reduced) { /* everything is already in place */ } else if (!seen && intro) runIntro()
  else heroIn(0.05)
})()

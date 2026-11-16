(() => {
  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'modalBackdrop';
  modal.innerHTML = `<form class="modal" id="authForm"><button type="button" class="close" data-close aria-label="Close">×</button><h2>Welcome to WBIFY Meet</h2><p class="muted">Sign in to save your meetings across devices.</p><div class="formRow"><label for="authEmail">Email</label><input id="authEmail" type="email" autocomplete="email" required></div><div class="formRow"><label for="authPassword">Password</label><input id="authPassword" type="password" autocomplete="current-password" minlength="8" required></div><p id="authStatus" role="status" class="muted"></p><button class="action" type="submit">Sign in</button><button class="action secondary" type="submit" value="signup" style="margin-top:10px">Create account</button></form>`;
  document.body.append(modal);
  const button = document.createElement('button');
  button.className = 'join';
  button.textContent = 'Sign in';
  document.querySelector('.topright').append(button);
  if (!window.supabase) {
    button.onclick = () => toast('Unable to load sign-in. Check your connection and reload.');
    return;
  }
  const config = window.SUPABASE_CONFIG;
  const client = window.supabase.createClient(config.url, config.publishableKey);
  window.meetAccount = { client, user: null };
  let generation = 0;
  async function refresh(session) {
    const current = ++generation;
    const user = session?.user || null;
    window.meetAccount.user = user;
    meetings = [];
    render();
    button.textContent = user ? 'Sign out' : 'Sign in';
    document.querySelector('.topright .pill').textContent = user ? user.email : 'Sign in to save meetings';
    document.querySelector('.sideBottom b').textContent = user ? user.email.split('@')[0] + "'s workspace" : 'Your workspace';
    document.querySelector('#dashboard .heading').textContent = user ? 'Good to see you, ' + user.email.split('@')[0] : 'Welcome to WBIFY Meet';
    if (!user) return;
    modal.classList.remove('show');
    try {
      const { data, error } = await client.from('meetings').select('id,title,starts_at,scheduled,notes').order('created_at', { ascending: false });
      if (current !== generation) return;
      if (error) throw error;
      meetings = data.map(m => ({ ...m, when: new Date(m.starts_at).getTime() }));
      render();
    } catch (error) {
      if (current === generation) {
        document.querySelector('#allList').textContent = 'Could not load meetings. Check database setup and reload.';
        toast(error.message);
      }
    }
  }
  button.onclick = async () => {
    if (!window.meetAccount.user) { modal.classList.add('show'); return; }
    const { error } = await client.auth.signOut();
    if (error) toast(error.message);
  };
  document.querySelector('#authForm').onsubmit = async e => {
    e.preventDefault();
    const status = document.querySelector('#authStatus');
    const buttons = [...e.target.querySelectorAll('button')];
    const signup = e.submitter?.value === 'signup';
    buttons.forEach(b => b.disabled = true);
    status.textContent = signup ? 'Creating account…' : 'Signing in…';
    const credentials = { email: document.querySelector('#authEmail').value.trim(), password: document.querySelector('#authPassword').value };
    try {
      const { data, error } = signup ? await client.auth.signUp(credentials) : await client.auth.signInWithPassword(credentials);
      if (error) throw error;
      status.textContent = data.session ? '' : 'Check your email to confirm your account, then sign in here.';
      document.querySelector('#authPassword').value = '';
    } catch (error) { status.textContent = error.message; }
    finally { buttons.forEach(b => b.disabled = false); }
  };
  client.auth.onAuthStateChange((_event, session) => { setTimeout(() => refresh(session), 0); });
  client.auth.getSession().then(({ data, error }) => {
    if (error) toast(error.message);
    if (generation === 0) refresh(data.session);
  }).catch(error => toast(error.message));
})();

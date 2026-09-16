import Icon from './Icon.jsx';
import { useAppContext } from '../context/AppContext.jsx';

export default function ProfilePage() {
  const { user, userProfile, goToWorkspace } = useAppContext();
  const alias = user?.displayName || userProfile?.alias || 'Guest';

  return <main className="profile-page">
    <section className="profile-page-shell">
      <button className="back-to-workspace-btn" onClick={goToWorkspace}><Icon name="arrow-left" /> WORKSPACE</button>
      <div className="page-kicker">ACCOUNT_CONTROL // PROFILE</div>
      <div className="profile-page-heading"><div className="avatar-wrapper profile-page-avatar"><img src={user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces'} alt="Profile" className="profile-avatar" /></div><div><h1>{alias}</h1><p>{user?.email}</p></div></div>
      <div className="profile-details-panel"><div><span className="profile-field-label">DISPLAY NAME</span><strong>{alias}</strong></div><div><span className="profile-field-label">EMAIL</span><strong>{user?.email || 'Not available'}</strong></div><div><span className="profile-field-label">AUTH PROVIDER</span><strong>{user?.providerData?.[0]?.providerId || 'Firebase Auth'}</strong></div></div>
    </section>
  </main>;
}
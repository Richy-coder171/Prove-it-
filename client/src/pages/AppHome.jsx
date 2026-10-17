import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';

export default function AppHome() {
  const { user } = useAuth();
  return <main className="app-home"><p className="eyebrow"><Sparkles size={15} /> Your ProveIt workspace</p><h1>Good to see you,<br /><em>{user?.fullName?.split(' ')[0]}.</em></h1><p className="app-home-intro">Your space for real work, thoughtful feedback, and what comes next.</p><section className="app-home-panel"><div><span className="role-tag">{user?.role}</span><h2>Your workspace is ready.</h2><p>Challenge creation and candidate workflows are arriving next. Your account and role are set up.</p></div><Link to="/ethics" className="text-link">How ProveIt works <ArrowUpRight size={15} /></Link></section></main>;
}

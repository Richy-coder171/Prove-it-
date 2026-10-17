import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";

export default function AppHome() {
  const { user } = useAuth();
  return (
    <main className="app-home">
      <p className="eyebrow">
        <Sparkles size={15} /> Your ProveIt workspace
      </p>
      <h1>
        Good to see you,
        <br />
        <em>{user?.fullName?.split(" ")[0]}.</em>
      </h1>
      <p className="app-home-intro">
        Your space for real work, thoughtful feedback, and what comes next.
      </p>
      <section className="app-home-panel">
        <div>
          <span className="role-tag">{user?.role}</span>
          <h2>Your workspace is ready.</h2>
          <p>
            {user?.role === "startup"
              ? "Start with a role or an idea, then shape the challenge before anyone sees it."
              : "Your personal workspace is ready for real work, thoughtful feedback, and new opportunities."}
          </p>
        </div>
        {user?.role === "startup" ? (
          <Link to="/startup/challenges/new" className="button button-dark">
            Create a challenge <ArrowRight size={16} />
          </Link>
        ) : (
          <Link to="/ethics" className="text-link">
            How ProveIt works <ArrowUpRight size={15} />
          </Link>
        )}
      </section>
    </main>
  );
}

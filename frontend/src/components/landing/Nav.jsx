import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Shield, Lock, LogOut } from "lucide-react";

const NavItem = ({ href, to, children, ...props }) => {
  if (href) {
    return <a href={href} {...props}>{children}</a>;
  }
  return <Link to={to} {...props}>{children}</Link>;
};

export const Nav = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const d = new Date();
      const opts = { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC" };
      setTime(new Intl.DateTimeFormat("en-GB", opts).format(d) + " UTC");
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-6 flex items-center justify-between mix-blend-difference text-foreground">
      <Link to="/" className="font-grotesk text-xl font-bold tracking-tighter" data-cursor>
        ◐ SENTIENT<span className="italic-serif font-normal">/engine</span>
      </Link>
      <div className="hidden md:flex items-center gap-10 font-mono text-xs uppercase tracking-[0.2em]">
        {isHome ? (
          <NavItem href="#pipeline" className="hover:text-iris transition-colors" data-cursor>Pipeline</NavItem>
        ) : (
          <NavItem to="/#pipeline" className="hover:text-iris transition-colors" data-cursor>Pipeline</NavItem>
        )}
        {isHome ? (
          <NavItem href="#capabilities" className="hover:text-iris transition-colors" data-cursor>Capabilities</NavItem>
        ) : (
          <NavItem to="/#capabilities" className="hover:text-iris transition-colors" data-cursor>Capabilities</NavItem>
        )}
        <Link 
          to="/pricing" 
          className={`hover:text-iris transition-colors ${location.pathname === '/pricing' ? 'text-[#c5f82a] border-b border-[#c5f82a]/50' : ''}`}
          data-cursor
        >
          Pricing
        </Link>
        {localStorage.getItem('sre_token') ? (
          <div className="flex items-center gap-4">
            <Link 
              to={(() => {
                try {
                  const user = JSON.parse(localStorage.getItem('sre_user') || '{}');
                  return user.role === 'Admin' ? "/admin/management" : "/dashboard";
                } catch {
                  return "/dashboard";
                }
              })()} 
              className="px-6 py-2 bg-iris text-white rounded-full hover:bg-iris/80 transition-all font-bold tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.3)]" 
              data-cursor
            >
              Enter Engine
            </Link>
            <button 
              onClick={() => {
                localStorage.removeItem('sre_token');
                localStorage.removeItem('sre_user');
                window.location.href = '/';
              }}
              className="px-6 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-all font-bold tracking-widest"
              data-cursor
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="px-6 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-all font-bold tracking-widest flex items-center gap-2" 
              data-cursor
            >
              <Lock size={14} className="text-iris" /> Login
            </Link>
            <Link 
              to="/signup" 
              className="px-6 py-2 bg-iris text-white rounded-full hover:bg-iris/80 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] font-bold tracking-widest flex items-center gap-2" 
              data-cursor
            >
              <Shield size={14} /> Sign Up
            </Link>
          </div>
        )}
      </div>
      <div className="font-mono text-xs uppercase tracking-[0.2em] hidden sm:block tabular-nums">
        {time}
      </div>
    </nav>
  );
};

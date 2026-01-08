import { NavLink } from 'react-router-dom';
import { Users, MapPin, LayoutDashboard, Shield, CalendarDays, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

type NavItem = {
  to: string;
  icon: LucideIcon | (() => JSX.Element);
  label: string;
};

export function Navigation() {
  const { currentUser } = useAppStore();
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  if (isAdmin) {
    return (
      <nav className="navigation admin-nav">
        <div className="nav-side nav-left admin-nav-side">
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item--active' : ''}`
            }
          >
            <Shield size={22} strokeWidth={1.8} />
            <span>Panel</span>
          </NavLink>
        </div>

        <NavLink
          to="/"
          className={({ isActive }) =>
            `nav-item-center admin-nav-center ${isActive ? 'nav-item-center--active' : ''}`
          }
        >
          <div className="nav-center-btn admin-home-btn">
            <LayoutDashboard size={26} strokeWidth={2} />
          </div>
          <span>Home</span>
        </NavLink>

        <div className="nav-side nav-right admin-nav-side">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item--active' : ''}`
            }
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt="Profile"
                style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid currentColor' }}
              />
            ) : (
              <Settings size={22} strokeWidth={1.8} />
            )}
            <span>Settings</span>
          </NavLink>
        </div>
      </nav>
    );
  }

  const isPembimbing = currentUser?.role?.toLowerCase() === 'pembimbing';

  const leftItems: NavItem[] = [
    { to: '/', icon: LayoutDashboard, label: 'Home' },
    { to: '/itinerary', icon: CalendarDays, label: 'Plan' },
  ];

  const rightItems: NavItem[] = [
    { to: '/users', icon: Users, label: 'Users' },
    ...(isPembimbing ? [{ to: '/admin', icon: Shield, label: 'Panel' }] as NavItem[] : []),
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="navigation">
      <div className="nav-side nav-left">
        {leftItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item--active' : ''}`
              }
            >
              <Icon size={22} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <NavLink
        to="/tracking"
        className={({ isActive }) =>
          `nav-item-center ${isActive ? 'nav-item-center--active' : ''}`
        }
      >
        <div className="nav-center-btn">
          <MapPin size={26} strokeWidth={2} />
        </div>
        <span>Tracking</span>
      </NavLink>

      <div className="nav-side nav-right">
        {rightItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item--active' : ''}`
              }
            >
              <Icon size={22} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

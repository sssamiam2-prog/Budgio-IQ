import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/income', label: 'Income', icon: '◇' },
  { to: '/expenses', label: 'Expenses', icon: '▤' },
  { to: '/insights', label: 'Insights', icon: '◎' },
] as const

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            'bottom-nav__link' + (isActive ? ' bottom-nav__link--active' : '')
          }
        >
          <span className="bottom-nav__icon" aria-hidden>
            {icon}
          </span>
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

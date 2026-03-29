import { Link } from 'react-router-dom'
import { AppVersionStamp } from './AppVersionStamp'

type Props = {
  title?: string
  showMenu?: boolean
}

export function HeaderBar({ title, showMenu }: Props) {
  return (
    <header className="header-bar">
      {showMenu ? (
        <button type="button" className="header-bar__icon-btn" aria-label="Menu">
          ☰
        </button>
      ) : (
        <span className="header-bar__spacer" />
      )}
      <div className="header-bar__brand">
        <img
          src="/branding/Budgio_IQ_Logo-removebg-preview.png"
          alt=""
          className="header-bar__logo"
          width={36}
          height={36}
        />
        {title ? <span className="header-bar__title">{title}</span> : null}
      </div>
      <div className="header-bar__actions">
        <AppVersionStamp variant="header" />
        <Link to="/settings" className="header-bar__icon-btn" aria-label="Settings">
          ⚙
        </Link>
      </div>
    </header>
  )
}

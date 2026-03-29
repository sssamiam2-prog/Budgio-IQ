import {
  APP_BUILD_TIME,
  APP_VERSION,
  formatBuildTime,
} from '../lib/appVersion'

type Variant = 'header' | 'auth' | 'boot'

export function AppVersionStamp({ variant }: { variant: Variant }) {
  if (variant === 'header') {
    return (
      <div
        className="app-version-stamp app-version-stamp--header"
        title={`Build ${APP_BUILD_TIME}`}
        aria-label={`App version ${APP_VERSION}, build ${formatBuildTime(APP_BUILD_TIME)}`}
      >
        <span className="app-version-stamp__ver">v{APP_VERSION}</span>
        <span className="app-version-stamp__time">
          {formatBuildTime(APP_BUILD_TIME)}
        </span>
      </div>
    )
  }

  const extra = ` app-version-stamp--${variant}`
  return (
    <div
      className={`app-version-stamp${extra}`}
      aria-label={`App version ${APP_VERSION}, build ${formatBuildTime(APP_BUILD_TIME)}`}
    >
      <span className="app-version-stamp__line">
        <span className="app-version-stamp__name">Budgio IQ</span>{' '}
        <span className="app-version-stamp__ver">v{APP_VERSION}</span>
      </span>
      <span className="app-version-stamp__time">
        {formatBuildTime(APP_BUILD_TIME)}
      </span>
    </div>
  )
}

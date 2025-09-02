import { Link } from 'react-router-dom'

type HeaderProps = {
    user: any | null
    onLogout: () => void
}

export function Header({ user, onLogout }: HeaderProps) {
    return (
        <div className="header">
            <div className="header-left">
                <h1>
                    <Link to="/">Recipe Box</Link>
                </h1>
                <Link to="/recipes">Recipes</Link>
                <Link to="/help">Help</Link>
            </div>
            <div className="header-right">
                {user ? (
                    <>
                        <Link to="/library">Library</Link>
                        <a onClick={onLogout}>Log Out</a>
                    </>
                ) : (
                    <>
                        <Link to="/log-in">Log In</Link>
                        <Link to="/sign-up">Sign Up</Link>
                    </>
                )}
            </div>
        </div>
    )
}

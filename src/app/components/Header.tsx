type HeaderProps = {
    onLogout: () => void
};

export function Header({ onLogout }: HeaderProps) {
    return (
        <div className="header">
            {
                /*
                This should be a <header> but Bun doesn't like that
                (randomly omits CSS rules), but this seems to work reliably. WTF!
                */
            }
            <h1>
                <span className="logo">🗃️</span>
                Recipe Box
            </h1>
            <nav>
                <ul>
                    <li>
                        <button
                            className="text"
                            onClick={onLogout}
                        >
                            Log Out
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    )
}
import { Link } from "react-router-dom";

type HeaderProps = {
	user: any | null;
	onLogout: () => void;
};

export function Header({ user, onLogout }: HeaderProps) {
	return (
		<div className="header">
			{/*
                This should be a <header> but Bun doesn't like that (randomly
                omits CSS rules), but this seems to work reliably. WTF!
            */}
			<h1>
				<span className="logo">🗃️</span>
				<Link to="/">Recipe Box</Link>
			</h1>
			<nav>
				<ul>
					{user ? (
						<>
							<li>
								<Link to="/library">
									<button className="text">Library</button>
								</Link>
							</li>
							<li>
								<button className="text" onClick={onLogout}>
									Log Out
								</button>
							</li>
						</>
					) : (
						<>
							<li>
								<Link to="/log-in">
									<button className="text">Log In</button>
								</Link>
							</li>
							<li>
								<Link to="/sign-up">
									<button className="text">Sign Up</button>
								</Link>
							</li>
						</>
					)}
				</ul>
			</nav>
		</div>
	);
}

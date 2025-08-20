type Props = {
	showLogin: () => void;
	showSignup: () => void;
};

export function Homepage({ showLogin, showSignup }: Props) {
	return (
		<main>
			<button onClick={showLogin}>Log In</button>
			<button onClick={showSignup}>Sign Up</button>
		</main>
	);
}

import { useState } from "react";
import { Link } from "react-router-dom";

type Props = {
	onSuccess: (user: { id: number; username: string }) => void;
};

export function SignupForm({ onSuccess }: Props) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleSignup = async () => {
		setError("");

		try {
			const res = await fetch("/api/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password }),
			});

			if (res.ok) {
				const data = await res.json();
				onSuccess(data);
			} else {
				const message = await res.text();
				setError(message || "Signup failed. Please try again.");
			}
		} catch (err) {
			setError("An error occurred. Please try again later.");
		}
	};

	return (
		<main className="auth-container">
			<div className="auth-wrapper">
				<h1>Sign Up</h1>
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						await handleSignup();
					}}
				>
					{error && <p className="error-message">{error}</p>}
					<div className="input-row">
						<input
							type="text"
							placeholder="Username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
						/>
						<input
							type="password"
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>
					<button type="submit">Sign Up</button>
				</form>
				<div className="auth-links">
					<Link to="/log-in" className="text">
						Already have an account?
					</Link>
					<Link to="/" className="text">
						Back to Home
					</Link>
				</div>
			</div>
		</main>
	);
}

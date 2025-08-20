import { useState } from "react";

type Props = {
    onSuccess: (user: { id: number; username: string }) => void;
    switchToSignup: () => void;
    showHomepage: () => void;
};

export function LoginForm({ onSuccess, switchToSignup, showHomepage }: Props) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async () => {
        setError("");

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                const data = await res.json();
                onSuccess(data);
            } else {
                setError("Login failed. Please check your credentials.");
            }
        } catch (err) {
            setError("An error occurred. Please try again later.");
        }
    };

    return (
        <main className="auth-container">
            <div className="auth-wrapper">
                <h1>Log In</h1>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleLogin();
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
                    <button type="submit">Log In</button>
                </form>
                <div className="auth-links">
                    <button className="text" onClick={switchToSignup}>
                        Need an account?
                    </button>
                    <button className="text" onClick={showHomepage}>
                        Back to Home
                    </button>
                </div>
            </div>
        </main>
    );
}

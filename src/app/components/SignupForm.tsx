import { useState } from "react";

type Props = {
    onSuccess: (user: { id: number; username: string }) => void;
    switchToLogin: () => void;
    showHomepage: () => void;
};

export function SignupForm({ onSuccess, switchToLogin, showHomepage }: Props) {
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
                const data = await res.json();
                setError(data.error || "Signup failed. Please try again.");
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
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSignup();
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
                    <button onClick={switchToLogin} className="text">
                        Already have an account?
                    </button>
                    <button className="text" onClick={showHomepage}>
                        Back to Home
                    </button>
                </div>
            </div>
        </main>
    );
}

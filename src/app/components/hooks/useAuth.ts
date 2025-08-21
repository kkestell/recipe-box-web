import { useState, useEffect } from "react";

type User = { id: number; username: string };

export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch("/api/me")
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                } else {
                    // Consume the response body to prevent Safari from choking
                    try {
                        await res.text();
                    } catch (e) {
                        // Ignore if we can't even read it as text
                    }
                }
                setIsLoading(false);
            })
            .catch(() => {
                setIsLoading(false);
            });
    }, []);

	const logout = async () => {
		await fetch("/api/logout", { method: "POST" });
		setUser(null);
	};

	return { user, setUser, logout, isLoading };
}

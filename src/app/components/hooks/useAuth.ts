import { useState, useEffect } from "react";

type User = { id: number; username: string };

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);

    // Check for an active session when the hook is first used.
    useEffect(() => {
        fetch("/api/me").then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            }
        });
    }, []);

    const logout = async () => {
        await fetch("/api/logout", { method: "POST" });
        setUser(null);
    };

    return { user, setUser, logout };
}
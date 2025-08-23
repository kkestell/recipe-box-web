import { useEffect, useState } from "react";

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

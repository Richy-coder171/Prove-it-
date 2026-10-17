import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

export function useAuth() {
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => (await api.get("/auth/me")).data.data.user,
    retry: false,
    staleTime: 60_000,
  });
  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  };
}

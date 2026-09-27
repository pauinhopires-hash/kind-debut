import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        navigate({ to: "/" });
        return;
      }
      setReady(true);
    };
    init();
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-3">
          <div className="mb-6 h-8 w-40 animate-pulse rounded-md bg-card" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-card" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-card" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-card" />
        </div>
      </div>
    );
  }

  return <Outlet />;
}

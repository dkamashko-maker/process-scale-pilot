import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical } from "lucide-react";
import type { UserRole } from "@/data/runTypes";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect
  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleLogin = () => {
    if (!name.trim()) return;
    login(name.trim(), role);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">BioProcess Monitor</CardTitle>
          <CardDescription>Run-centric monitoring &amp; event logging</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
                <SelectItem value="operator">Operator — Can log events</SelectItem>
                <SelectItem value="manager">Manager — Full access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleLogin} disabled={!name.trim()}>
            Sign In
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Prototype — no password required
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const ALLOWED_DOMAINS = ["beforest.co", "bewild.life"];

export function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    const domain = email.split("@")[1];
    return ALLOWED_DOMAINS.includes(domain);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!email.trim()) {
        throw new Error("Please enter your email address");
      }

      if (!isValidEmail(email)) {
        throw new Error("Please use your @beforest.co or @bewild.life email address");
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      setSuccess("Check your email for the login link!");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 mb-4 rounded-full bg-primary flex items-center justify-center">
            <span className="text-4xl font-bold text-primary-foreground">W</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold">
            Sign in to Snippets
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your email to receive a magic link
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email-address" className="sr-only">
              Email address
            </label>
            <Input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="text-center"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Sending magic link..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

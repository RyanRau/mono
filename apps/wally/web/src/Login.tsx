import { useState } from "react";
import { useSignInEmailPassword } from "@nhost/react";
import { css } from "goober";
import { Card, Flexbox, Header, Text, TextInput, Button, useTheme } from "bluestar";

export default function Login() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signInEmailPassword, isLoading, error } = useSignInEmailPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInEmailPassword(email, password);
  };

  return (
    <Flexbox justifyContent="center" alignItems="center" height="100vh">
      <form onSubmit={handleSubmit}>
        <Card padding={32}>
          <Flexbox direction="column" gap={16} width={320}>
            <Header variant="h1">Wally</Header>
            <Text variant="caption">Sign in to manage your preferred products</Text>
            <TextInput
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@email.com"
            />
            <div>
              <label
                className={css`
                  display: block;
                  font-family: ${theme.fonts.body};
                  font-size: ${theme.textTypes.label.size};
                  font-weight: 600;
                  color: ${theme.colors.text};
                  margin-bottom: 4px;
                `}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={css`
                  width: 100%;
                  padding: 8px 12px;
                  border: 1px solid ${theme.colors.border};
                  border-radius: ${theme.radius};
                  background-color: ${theme.colors.background};
                  color: ${theme.colors.text};
                  font-family: ${theme.fonts.body};
                  font-size: ${theme.textTypes.subtitle.size};
                  outline: none;
                  box-sizing: border-box;
                  transition:
                    border-color 0.15s ease,
                    box-shadow 0.15s ease;
                  &::placeholder {
                    color: ${theme.colors.textMuted};
                  }
                  &:focus {
                    border-color: ${theme.colors.primary};
                    box-shadow: 0 0 0 2px ${theme.colors.primary}33;
                  }
                `}
              />
            </div>
            {error && <Text color={theme.colors.error}>{error.message}</Text>}
            <Button
              label={isLoading ? "Signing in..." : "Sign In"}
              isDisabled={isLoading}
              onClick={() => handleSubmit(new Event("submit") as unknown as React.FormEvent)}
            />
          </Flexbox>
        </Card>
      </form>
    </Flexbox>
  );
}

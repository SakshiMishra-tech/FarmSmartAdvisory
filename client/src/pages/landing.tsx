import { LoginForm } from '@/components/login-form';

interface LandingProps {
  onLogin: (farmer: any) => void;
}

export default function Landing({ onLogin }: LandingProps) {
  const handleLogin = (farmer: any) => {
    localStorage.setItem('farmwise-farmer', JSON.stringify(farmer));
    onLogin(farmer);
  };

  return <LoginForm onLogin={handleLogin} />;
}

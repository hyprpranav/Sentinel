// app/(auth)/manager-register/page.tsx
// This route is deprecated - manager registration is now part of the unified /register page.
import { redirect } from 'next/navigation';

export default function ManagerRegisterRedirect() {
  redirect('/register');
}

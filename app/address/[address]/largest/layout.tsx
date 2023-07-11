import { LargestAccountsProvider } from "@providers/largest-accounts";

type Props = { children: React.ReactNode };
export default function AddressLayout({ children }: Props) {
  return (
    <LargestAccountsProvider>
      {children}
    </LargestAccountsProvider>
  );
}
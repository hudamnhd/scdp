
// pages/kelas/[id].js

import { useRouter } from 'next/router';

export async function getServerSideProps() {
  
  return {
    redirect: {
      destination: `/dashboard`,
      permanent: true,
    },
  };
}

// Optional: You can render a component to display while redirecting
const RedirectPage = () => {
  const router = useRouter();
  
  // You can show a loading spinner or message while redirecting
  return (
    <div>
      Redirecting...
    </div>
  );
}

export default RedirectPage;


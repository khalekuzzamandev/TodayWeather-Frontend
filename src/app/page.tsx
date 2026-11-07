import Allcountryapi from "@/Components/Apis/Allcountryapi";
import { Suspense } from "react";

export default function Home() {
  return (
   <div className="min-h-screen max-w-7xl mx-auto">
    hello this home page
    <Suspense fallback={<p className="text-2xl">loading..........</p>} >
        <Allcountryapi />
    </Suspense>
   </div>
  );
}

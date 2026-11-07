
import Image from "next/image";
import React from "react";

interface Country {
  name: string;
  code: string;
  dial_code: string;
}

const Allcountryapi = async () => {
  const res = await fetch(
    "https://countriesnow.space/api/v0.1/countries/codes",
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch countries");
  }

  const response: { data: Country[] } = await res.json();

  const allCoutrys = response.data;

  return (
    <div className="min-h-screen p-5">
      <h1 className="text-2xl font-bold mb-5">
        All Countries ({allCoutrys.length})
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allCoutrys.map((allcon, index) => (
          <div
            key={`${allcon.code}-${index}`}
            className="flex items-center gap-3 rounded-xl border p-4 shadow-sm"
          >
            <Image
              src={`https://flagcdn.com/w80/${allcon.code.toLowerCase()}.png`}
              alt={`${allcon.name} flag`}
              width={45}
              height={30}
              className="w-12 h-8 object-cover rounded shadow-sm"
            />

            <div>
              <h2 className="font-semibold">{allcon.name}</h2>
              <p className="text-sm text-gray-500">
                {allcon.code}
              </p>
              <p className="text-sm font-medium">
                {allcon.dial_code}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Allcountryapi;

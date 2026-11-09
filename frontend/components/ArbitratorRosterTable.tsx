import React, { useState, useMemo } from "react";

export interface ArbitratorProfile {
  address: string;
  name: string;
  bondedAmount: number;
  disputesResolved: number;
  rating: number; // 0.0 to 5.0
  activeDisputes: number;
}

export interface ArbitratorRosterTableProps {
  arbitrators: ArbitratorProfile[];
  onSelectArbitrator?: (address: string) => void;
  selectedAddress?: string;
  tokenSymbol?: string;
}

type SortField = "name" | "bondedAmount" | "disputesResolved" | "rating";

export const ArbitratorRosterTable: React.FC<ArbitratorRosterTableProps> = ({
  arbitrators,
  onSelectArbitrator,
  selectedAddress,
  tokenSymbol = "XLM",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("rating");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredAndSorted = useMemo(() => {
    return arbitrators
      .filter((arb) => {
        const query = searchQuery.toLowerCase().trim();
        return (
          arb.name.toLowerCase().includes(query) ||
          arb.address.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === "name") {
          diff = a.name.localeCompare(b.name);
        } else {
          diff = (a[sortField] as number) - (b[sortField] as number);
        }
        return sortAsc ? diff : -diff;
      });
  }, [arbitrators, searchQuery, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "name");
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b p-4 gap-3 dark:border-gray-700">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">
            Authorized Arbitrator Panel
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filteredAndSorted.length} bonded arbitrators ready for dispute adjudication
          </p>
        </div>
        <div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search arbitrator by name or address..."
            className="w-full sm:w-64 rounded-lg border border-gray-300 p-2 text-xs text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
          <thead className="border-b bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
            <tr>
              <th
                scope="col"
                className="cursor-pointer p-3 hover:text-gray-900 dark:hover:text-white"
                onClick={() => handleSort("name")}
              >
                Arbitrator {sortField === "name" && (sortAsc ? "▲" : "▼")}
              </th>
              <th
                scope="col"
                className="cursor-pointer p-3 hover:text-gray-900 dark:hover:text-white"
                onClick={() => handleSort("bondedAmount")}
              >
                Bond Staked ({tokenSymbol}) {sortField === "bondedAmount" && (sortAsc ? "▲" : "▼")}
              </th>
              <th
                scope="col"
                className="cursor-pointer p-3 hover:text-gray-900 dark:hover:text-white"
                onClick={() => handleSort("disputesResolved")}
              >
                Resolved {sortField === "disputesResolved" && (sortAsc ? "▲" : "▼")}
              </th>
              <th
                scope="col"
                className="cursor-pointer p-3 hover:text-gray-900 dark:hover:text-white"
                onClick={() => handleSort("rating")}
              >
                Reputation {sortField === "rating" && (sortAsc ? "▲" : "▼")}
              </th>
              <th scope="col" className="p-3 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
                  No matching arbitrators found.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((arb) => {
                const isSelected = selectedAddress === arb.address;
                const isBonded = arb.bondedAmount > 0;

                return (
                  <tr
                    key={arb.address}
                    className={`transition hover:bg-gray-50/80 dark:hover:bg-gray-700/50 ${
                      isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                    }`}
                  >
                    <td className="p-3 font-medium text-gray-900 dark:text-white">
                      <div>{arb.name}</div>
                      <div className="font-mono text-[11px] text-gray-400">
                        {truncateAddress(arb.address)}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-semibold">
                      {isBonded ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {arb.bondedAmount.toLocaleString()} {tokenSymbol}
                        </span>
                      ) : (
                        <span className="text-gray-400">Unbonded</span>
                      )}
                    </td>
                    <td className="p-3 font-mono">
                      {arb.disputesResolved} cases
                      {arb.activeDisputes > 0 && (
                        <span className="ml-1 text-[11px] text-amber-600">
                          ({arb.activeDisputes} active)
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-amber-500">
                      ★ {arb.rating.toFixed(1)} / 5.0
                    </td>
                    <td className="p-3 text-right">
                      {onSelectArbitrator && (
                        <button
                          type="button"
                          onClick={() => onSelectArbitrator(arb.address)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                          }`}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

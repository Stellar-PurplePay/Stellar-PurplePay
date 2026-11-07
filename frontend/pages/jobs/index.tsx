/**
 * pages/jobs/index.tsx
 * Browse open jobs on Stellar PurplePay.
 */
import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import JobCard from "@/components/JobCard";
import JobFiltersPanel from "@/components/JobFiltersPanel";
import { fetchJobs } from "@/lib/api";
import type { Job } from "@/utils/types";

export default function JobsPage() {
  const router = useRouter();
  const category = typeof router.query.category === "string" ? router.query.category : undefined;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);
  const activeCategoryRef = useRef(category);

  useEffect(() => {
    activeCategoryRef.current = category;
    setNextCursor(null);
    setLoading(true);

    let cancelled = false;
    const params: { category?: string; cursor?: string } = {};
    if (category) params.category = category;

    fetchJobs(params)
      .then((data: any) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          setJobs(data);
          setNextCursor(null);
        } else if (data && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          setNextCursor(data.nextCursor || null);
        } else {
          setJobs([]);
          setNextCursor(null);
        }
      })
      .catch(() => {
        if (!cancelled) setJobs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  const rowVirtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastItem = virtualItems[virtualItems.length - 1];

  useEffect(() => {
    if (!lastItem || loadingMore || !nextCursor) return;
    if (lastItem.index >= jobs.length - 1) {
      const currentCategory = activeCategoryRef.current;
      setLoadingMore(true);
      const params: { category?: string; cursor?: string } = {
        cursor: nextCursor,
      };
      if (currentCategory) params.category = currentCategory;

      fetchJobs(params)
        .then((data: any) => {
          if (activeCategoryRef.current !== currentCategory) return;
          if (data && Array.isArray(data.jobs)) {
            setJobs((prev) => [...prev, ...data.jobs]);
            setNextCursor(data.nextCursor || null);
          } else {
            setNextCursor(null);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoadingMore(false);
        });
    }
  }, [lastItem, loadingMore, nextCursor, jobs.length]);

  useEffect(() => {
    const handleFocusSearch = () => {};
    const handleToggleBookmark = () => {};
    const handleToggleTheme = () => {};

    window.addEventListener("shortcut-focus-search", handleFocusSearch);
    window.addEventListener("shortcut-toggle-bookmark", handleToggleBookmark);
    window.addEventListener("shortcut-toggle-theme", handleToggleTheme);

    return () => {
      window.removeEventListener("shortcut-focus-search", handleFocusSearch);
      window.removeEventListener("shortcut-toggle-bookmark", handleToggleBookmark);
      window.removeEventListener("shortcut-toggle-theme", handleToggleTheme);
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <Head>
        <title>Browse Jobs | Stellar PurplePay</title>
        <meta
          name="description"
          content="Explore open freelance jobs secured by Soroban escrow on Stellar."
        />
      </Head>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-amber-100 mb-1">
            Browse Jobs
          </h1>
          <p className="text-amber-800 text-sm">
            Find non-custodial freelance gigs secured with smart contract escrow
          </p>
        </div>
        <Link href="/post-job" className="btn-primary text-sm self-start sm:self-auto">
          Post a Job →
        </Link>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <JobFiltersPanel />
        </aside>
        <main className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-16 text-amber-800">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="card text-center py-16">
              <p className="font-display text-xl text-amber-100 mb-2">
                No jobs found
              </p>
              <p className="text-amber-800 text-sm mb-6">
                Be the first to post a job on Stellar PurplePay!
              </p>
              <Link href="/post-job" className="btn-primary text-sm">
                Post a Job →
              </Link>
            </div>
          ) : (
            <div ref={parentRef} className="grid sm:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
  };
};

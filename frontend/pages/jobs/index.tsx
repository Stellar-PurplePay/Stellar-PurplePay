/**
 * pages/jobs/index.tsx
 * Browse open jobs on Stellar PurplePay.
 */
import type { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import JobCard from "@/components/JobCard";
import JobFiltersPanel from "@/components/JobFiltersPanel";
import { fetchJobs } from "@/lib/api";
import type { Job } from "@/utils/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs()
      .then((data) => setJobs(data || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
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
            <div className="grid sm:grid-cols-2 gap-4">
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
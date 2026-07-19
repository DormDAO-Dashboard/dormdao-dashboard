import Image from "next/image";
import Link from "next/link";
import { SchoolLogo } from "@/components/SchoolLogo";
import { schoolDisplayName } from "@/lib/schoolData";
import { ExternalLink } from "lucide-react";

const SCHOOLS = [
  { name: "Oregon",        slug: "oregon" },
  { name: "Penn",          slug: "penn" },
  { name: "Dartmouth",     slug: "dartmouth" },
  { name: "Texas",         slug: "texas" },
  { name: "Michigan",      slug: "michigan" },
  { name: "NYU",           slug: "nyu" },
  { name: "Cornell",       slug: "cornell" },
  { name: "Columbia",      slug: "columbia" },
  { name: "Waterloo",      slug: "waterloo" },
  { name: "Berkeley",      slug: "berkeley" },
  { name: "Purdue",        slug: "purdue" },
  { name: "Vanderbilt",    slug: "vanderbilt" },
  { name: "Boston College",slug: "boston-college" },
  { name: "Cambridge",     slug: "cambridge" },
  { name: "USC",           slug: "usc" },
  { name: "Villanova",     slug: "villanova" },
  { name: "St. Andrews",   slug: "st-andrews" },
];

const STEPS = [
  {
    num: "1",
    title: "Schools Join",
    desc: "University blockchain clubs apply and join DormDAO, committing ETH to the shared treasury.",
  },
  {
    num: "2",
    title: "Each School Manages",
    desc: "Each sub-DAO independently selects tokens, manages its portfolio, and tracks performance.",
  },
  {
    num: "3",
    title: "Performance Tracked Here",
    desc: "This dashboard provides real-time transparency into every school's holdings, returns, and rankings.",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center py-16">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.jpg"
            width={96}
            height={96}
            alt="DormDAO"
            style={{ borderRadius: "16px" }}
          />
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 dark:text-white mb-4">DormDAO</h1>
        <p className="text-lg text-gray-500 mb-8">
          The world&apos;s first multi-university crypto investment DAO
        </p>
        <a
          href="https://www.dormdao.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors font-medium"
        >
          Visit DormDAO.io <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        {[
          { label: "Founded", value: "Oct 2023" },
          { label: "Universities", value: "17" },
          { label: "AUM", value: "~$1.18M" },
          { label: "ETH Invested", value: "760 ETH" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4 text-center">
            <div className="text-2xl font-semibold font-mono text-gray-900 dark:text-white mb-1">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* What is DormDAO */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">What is DormDAO?</h2>
        <p className="text-gray-400 leading-relaxed mb-4">
          DormDAO is a student-run investment DAO uniting 17 university blockchain clubs across the United States, Canada, and the UK. Founded in October 2023, it gives student investors hands-on experience managing real crypto portfolios and competing against each other in a transparent, on-chain leaderboard.
        </p>
        <p className="text-gray-400 leading-relaxed">
          Each member school operates as an independent sub-DAO with its own ETH allocation. Schools research, debate, and vote on investments—gaining practical experience in DeFi, token analysis, and decentralized governance while managing real capital.
        </p>
      </div>

      {/* How it works */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {STEPS.map(({ num, title, desc }) => (
            <div key={num} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 text-primary font-bold text-lg flex items-center justify-center mx-auto mb-4">
                {num}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-8 mb-12 text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Our Mission</h2>
        <p className="text-gray-300 leading-relaxed max-w-2xl mx-auto">
          Investing in the future of blockchain and Web3 from university campuses — giving the next generation of crypto builders real capital, real stakes, and real experience before they graduate.
        </p>
      </div>

      {/* Member schools */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Member Schools</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {SCHOOLS.map(({ name, slug }) => (
            <Link key={slug} href={`/schools/${slug}`}>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-4 hover:border-primary/40 hover:bg-gray-800/50 transition-all cursor-pointer flex flex-col items-center gap-2 text-center">
                <SchoolLogo name={name} size={40} />
                <span className="text-sm text-gray-900 dark:text-white font-medium">{schoolDisplayName(name)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="text-center pb-16">
        <p className="text-gray-500 text-sm mb-4">
          Learn more about DormDAO and get involved
        </p>
        <a
          href="https://www.dormdao.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          dormdao.io <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

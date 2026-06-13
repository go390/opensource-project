import { Mail, Phone } from "lucide-react";

const teamMembers = [
  {
    initials: "TG",
    name:     "TaeYoung Go",
    role:     "Team Leader · Back-End & AI",
    email:    "goty390@gmail.com",
    phone:    "+82 10-5101-9959",
  },
  {
    initials: "OB",
    name:     "Ononmurun Bazarragchaa",
    role:     "Database · Front-End Support",
    email:    "ononmurunb69@gmail.com",
    phone:    "+82-10-1111-1111",
  },
  {
    initials: "MB",
    name:     "Munkh-Orgil Batzaya",
    role:     "Front-End",
    email:    "munkhorgil0207b@gmail.com",
    phone:    "+82-10-8089-8334",
  },
];

const projectStats = [
  { value: "3",   label: "Team Members"        },
  { value: "68%", label: "Prediction Accuracy" },
  { value: "900+", label: "Tracked Stocks"      },
];

function TeamMemberCard({ member }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
          {member.initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{member.name}</p>
          <p className="text-xs text-gray-500 truncate">{member.role}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-xs text-gray-500">
          <Mail size={13} className="flex-shrink-0 mt-0.5" />
          <span className="break-all">{member.email}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Phone size={13} className="flex-shrink-0" />
          <span>{member.phone}</span>
        </div>
      </div>
    </div>
  );
}

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Meet the Team</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-10 max-w-4xl mx-auto">
          {teamMembers.map((member, idx) => (
            <TeamMemberCard key={idx} member={member} />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10 text-center max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-4">About StockSense</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            StockSense is an AI-powered stock market platform that helps users track stocks, analyze market trends, and make informed investment decisions through intelligent recommendations and real-time insights.
          </p>

          <div className="mt-8 sm:mt-10 grid grid-cols-3 gap-3 sm:gap-6 pt-6 sm:pt-8 border-t border-gray-100">
            {projectStats.map((stat, idx) => (
              <div key={idx}>
                <p className="text-xl sm:text-2xl font-black text-green-500">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
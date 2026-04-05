import { motion } from "motion/react";
import { Download, Eye, Trash2, FileText, Image, Archive } from "lucide-react";

export default function Results() {
  const results = [
    {
      id: "4fab1ea0...",
      name: "Render Output",
      type: "Video",
      size: "2.4 GB",
      date: "2 hours ago",
      status: "completed",
      fileType: "video",
    },
    {
      id: "7a3c2de1...",
      name: "Training Checkpoint",
      type: "Model",
      size: "1.8 GB",
      date: "1 day ago",
      status: "completed",
      fileType: "archive",
    },
    {
      id: "9ef4b832...",
      name: "Inference Results",
      type: "JSON",
      size: "24 MB",
      date: "3 days ago",
      status: "completed",
      fileType: "text",
    },
    {
      id: "2c8f1a90...",
      name: "Generated Images",
      type: "Image Set",
      size: "456 MB",
      date: "5 days ago",
      status: "completed",
      fileType: "image",
    },
  ];

  return (
    <div className="p-8 relative">
      {/* 3D Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          className="absolute top-40 right-60 w-52 h-52 border-2 border-cyan-400/35 rounded-full shadow-lg shadow-cyan-400/25"
          animate={{
            rotateX: [0, 360],
            rotateZ: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transform: "perspective(1000px)", transformStyle: "preserve-3d" }}
        />
        <motion.div
          className="absolute bottom-40 right-20 w-44 h-44 border-2 border-blue-400/30"
          style={{
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            transform: "perspective(1000px)",
            transformStyle: "preserve-3d"
          }}
          animate={{
            rotateY: [0, 360],
            y: [-15, 15, -15],
          }}
          transition={{
            rotateY: {
              duration: 16,
              repeat: Infinity,
              ease: "linear",
            },
            y: {
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Results</h1>
          <p className="text-slate-400">Download and manage your completed job outputs.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors">
            Filter
          </button>
          <button className="px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors">
            Sort by Date
          </button>
        </div>
      </div>

      {/* Storage Usage */}
      <motion.div
        className="relative z-10 bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Storage Usage</h3>
            <p className="text-slate-400 text-sm">4.7 GB of 50 GB used</p>
          </div>
          <div className="text-cyan-400 text-2xl font-bold">9.4%</div>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
            initial={{ width: "0%" }}
            animate={{ width: "9.4%" }}
            transition={{ duration: 1.5 }}
          />
        </div>
      </motion.div>

      {/* Results Grid */}
      <div className="relative z-10 grid grid-cols-1 gap-4">
        {results.map((result, index) => (
          <motion.div
            key={result.id}
            className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-6 hover:border-cyan-500/30 transition-all group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between">
              {/* File Info */}
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${getIconBg(result.fileType)}`}>
                  {getFileIcon(result.fileType)}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{result.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="font-mono">{result.id}</span>
                    <span>•</span>
                    <span>{result.type}</span>
                    <span>•</span>
                    <span>{result.size}</span>
                    <span>•</span>
                    <span>{result.date}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button className="p-2 bg-slate-800/50 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white hover:border-cyan-500 transition-all">
                  <Eye className="w-5 h-5" />
                </button>
                <button className="p-2 bg-slate-800/50 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-cyan-400 hover:border-cyan-500 transition-all">
                  <Download className="w-5 h-5" />
                </button>
                <button className="p-2 bg-slate-800/50 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-red-400 hover:border-red-500 transition-all">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State (Hidden when there are results) */}
      {/*
      <motion.div
        className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl p-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Results Yet</h3>
        <p className="text-slate-400 mb-6">Complete jobs will appear here for download</p>
        <Link to="/dashboard/submit-job">
          <button className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors">
            Submit Your First Job
          </button>
        </Link>
      </motion.div>
      */}
    </div>
  );
}

function getFileIcon(type: string) {
  switch (type) {
    case "video":
      return <FileText className="w-6 h-6 text-purple-400" />;
    case "archive":
      return <Archive className="w-6 h-6 text-blue-400" />;
    case "text":
      return <FileText className="w-6 h-6 text-cyan-400" />;
    case "image":
      return <Image className="w-6 h-6 text-green-400" />;
    default:
      return <FileText className="w-6 h-6 text-slate-400" />;
  }
}

function getIconBg(type: string) {
  switch (type) {
    case "video":
      return "bg-purple-500/20";
    case "archive":
      return "bg-blue-500/20";
    case "text":
      return "bg-cyan-500/20";
    case "image":
      return "bg-green-500/20";
    default:
      return "bg-slate-500/20";
  }
}

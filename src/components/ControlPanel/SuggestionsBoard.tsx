import React, { useState } from "react";
import { CommunitySuggestion } from "../../types";
import { Lightbulb, ThumbsUp, MessageSquarePlus, CheckCircle, Clock } from "lucide-react";

interface SuggestionsBoardProps {
  suggestions: CommunitySuggestion[];
  onAddSuggestion: (sug: Omit<CommunitySuggestion, "id" | "upvotes" | "status" | "createdAt">) => Promise<void>;
  onUpvote: (id: string) => void;
}

export const SuggestionsBoard: React.FC<SuggestionsBoardProps> = ({
  suggestions,
  onAddSuggestion,
  onUpvote,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CommunitySuggestion["category"]>("feature");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    await onAddSuggestion({
      author: author.trim() || "Team Member",
      title,
      description,
      category,
    });
    setTitle("");
    setDescription("");
    setShowForm(false);
    setSubmitting(false);
  };

  const filtered =
    filterCategory === "all"
      ? suggestions
      : suggestions.filter((s) => s.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#191e27] p-4 border border-[#2a3140]">
        <div>
          <h3 className="text-base font-semibold text-[#eef1f6] flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[#f2a65a]" />
            Team Feedback & Ideas Box
          </h3>
          <p className="text-xs text-[#8b93a7] mt-0.5">
            Suggest new servo gestures, personality quirks, or hardware features for Jovan K Rajiv, Rayan Ilah, and Rayan Najeeb.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f2a65a] hover:bg-[#f2a65a]/90 text-[#10131a] font-mono text-xs font-bold transition-colors cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>{showForm ? "Close Form" : "Submit Idea"}</span>
        </button>
      </div>

      {/* Suggestion Form Drawer */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#141820] border border-[#f2a65a]/40 p-5 space-y-4">
          <h4 className="font-mono text-sm font-bold text-[#f2a65a]">
            Submit Idea for Zonyx+ Prototype
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#8b93a7] mb-1">Your Name</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Jovan, Rayan, or Fellow Maker"
                className="w-full bg-[#10131a] border border-[#2a3140] px-3 py-2 text-sm text-[#eef1f6] focus:border-[#f2a65a] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#8b93a7] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#10131a] border border-[#2a3140] px-3 py-2 text-sm text-[#eef1f6] outline-none font-mono"
              >
                <option value="servo">Servo Motion / Gesture</option>
                <option value="personality">Personality / Voice</option>
                <option value="hardware">Hardware / Screen / Battery</option>
                <option value="feature">General Feature / Software</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8b93a7] mb-1">Idea Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Add sleep snoring sound effect when idle"
              required
              className="w-full bg-[#10131a] border border-[#2a3140] px-3 py-2 text-sm text-[#eef1f6] focus:border-[#f2a65a] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8b93a7] mb-1">Description / Details</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Explain how the robot should behave or what hardware wiring is needed..."
              required
              className="w-full bg-[#10131a] border border-[#2a3140] focus:border-[#f2a65a] p-3 text-sm text-[#eef1f6] outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-[#2a3140] text-xs font-mono text-[#8b93a7] hover:text-[#eef1f6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#f2a65a] hover:bg-[#f2a65a]/90 text-[#10131a] text-xs font-mono font-bold cursor-pointer"
            >
              {submitting ? "Posting..." : "Post to Community Board"}
            </button>
          </div>
        </form>
      )}

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 text-xs font-mono">
        {["all", "servo", "personality", "hardware", "feature"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 border capitalize transition-colors cursor-pointer ${
              filterCategory === cat
                ? "bg-[#5eead4] border-[#5eead4] text-[#10131a] font-bold"
                : "bg-[#141820] border-[#2a3140] text-[#8b93a7] hover:border-[#5eead4]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-4 bg-[#141820] border border-[#2a3140] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h5 className="font-semibold text-[#eef1f6] text-sm">{item.title}</h5>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10131a] border border-[#2a3140] text-[#8b93a7] uppercase">
                  {item.category}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#5eead4]/10 text-[#5eead4] border border-[#5eead4]/20 flex items-center gap-1">
                  {item.status === "implemented" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {item.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-[#8b93a7] leading-relaxed max-w-2xl">{item.description}</p>
              <div className="text-[11px] font-mono text-[#8b93a7]">
                Proposed by <span className="text-[#c7cde0]">{item.author}</span>
              </div>
            </div>

            <button
              onClick={() => onUpvote(item.id)}
              className="self-start sm:self-center flex items-center gap-2 px-3.5 py-2 bg-[#10131a] hover:bg-[#191e27] border border-[#2a3140] hover:border-[#5eead4] text-[#eef1f6] text-xs font-mono transition-all cursor-pointer group"
            >
              <ThumbsUp className="w-3.5 h-3.5 text-[#5eead4] group-hover:scale-110 transition-transform" />
              <span className="font-bold text-[#5eead4]">{item.upvotes}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

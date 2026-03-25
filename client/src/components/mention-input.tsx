import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MentionableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  type: "admin" | "client";
}

interface MentionInputProps {
  threadId: string;
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentions: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;
  "data-testid"?: string;
}

export function MentionInput({
  threadId,
  value,
  onChange,
  onMentionsChange,
  placeholder = "Type a message...",
  disabled = false,
  onSubmit,
  "data-testid": testId,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [trackedMentions, setTrackedMentions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data: mentionableUsers = [] } = useQuery<MentionableUser[]>({
    queryKey: ["/api/chat/threads", threadId, "mentionable-users"],
    enabled: !!threadId,
  });

  const filteredUsers = mentionableUsers.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const query = mentionQuery.toLowerCase();
    return fullName.includes(query) || user.email.toLowerCase().includes(query);
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);

    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");

    if (lastAtPos !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtPos + 1);
      const hasSpaceAfterAt = /\s/.test(textAfterAt.slice(0, textAfterAt.indexOf(" ") === -1 ? undefined : textAfterAt.indexOf(" ")));
      
      if (!hasSpaceAfterAt || textAfterAt.indexOf(" ") === -1) {
        setMentionQuery(textAfterAt);
        setMentionStartPos(lastAtPos);
        setShowSuggestions(true);
        setSuggestionIndex(0);
        return;
      }
    }

    setShowSuggestions(false);
    setMentionQuery("");
    setMentionStartPos(null);
  };

  const insertMention = useCallback((user: MentionableUser) => {
    if (mentionStartPos === null) return;

    const beforeMention = value.slice(0, mentionStartPos);
    const cursorPos = inputRef.current?.selectionStart || mentionStartPos + mentionQuery.length + 1;
    const afterMention = value.slice(cursorPos);

    const mentionText = `@${user.firstName} ${user.lastName}`;
    const newValue = `${beforeMention}${mentionText} ${afterMention}`;

    onChange(newValue);
    
    if (!trackedMentions.includes(user.id)) {
      const newMentions = [...trackedMentions, user.id];
      setTrackedMentions(newMentions);
      onMentionsChange(newMentions);
    }

    setShowSuggestions(false);
    setMentionQuery("");
    setMentionStartPos(null);

    setTimeout(() => {
      const newCursorPos = beforeMention.length + mentionText.length + 1;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      inputRef.current?.focus();
    }, 0);
  }, [mentionStartPos, mentionQuery, value, onChange, trackedMentions, onMentionsChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredUsers.length === 0) {
      if (e.key === "Enter" && !e.shiftKey && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSuggestionIndex((prev) => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSuggestionIndex((prev) => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        if (filteredUsers[suggestionIndex]) {
          insertMention(filteredUsers[suggestionIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value === "") {
      setTrackedMentions([]);
      onMentionsChange([]);
    }
  }, [value, onMentionsChange]);

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={testId}
        className="flex-1"
        autoComplete="off"
      />
      
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-md z-50"
          data-testid="mention-suggestions"
        >
          <ScrollArea className="max-h-48">
            {filteredUsers.map((user, index) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-2 p-2 text-left hover-elevate",
                  index === suggestionIndex && "bg-accent"
                )}
                onClick={() => insertMention(user)}
                data-testid={`mention-user-${user.id}`}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {user.firstName[0]}{user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {user.type === "admin" ? "Agency" : "Client"}
                  </span>
                </div>
              </button>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export function renderMessageWithMentions(content: string): React.ReactNode {
  const mentionPattern = /@([A-Za-z]+ [A-Za-z]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <span 
        key={match.index} 
        className="text-primary font-medium bg-primary/10 rounded px-1"
      >
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

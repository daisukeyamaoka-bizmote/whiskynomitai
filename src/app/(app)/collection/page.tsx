"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, Filter, Camera, Loader2, Bookmark, X, Wine } from "lucide-react";
import Image from "next/image";
import WhiskyLoader from "@/components/WhiskyLoader";

interface TastingRecord {
  id: string;
  name: string;
  distillery: string | null;
  region: string | null;
  type: string | null;
  rating: number;
  photo_url: string | null;
  flavor_tags: string[];
  created_at: string;
}

interface BookmarkItem {
  id: string;
  post_id: string;
  whiskey_name: string;
  whiskey_distillery: string | null;
  whiskey_region: string | null;
  whiskey_type: string | null;
  whiskey_rating: number | null;
  whiskey_photo_url: string | null;
  whiskey_flavor_tags: string[];
  created_at: string;
}

type CollectionTab = "drank" | "tsuginomu";

export default function CollectionPage() {
  const [collectionTab, setCollectionTab] = useState<CollectionTab>("drank");
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [minRating, setMinRating] = useState("");
  const [sort, setSort] = useState("created_at");
  const [showFilters, setShowFilters] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input (300ms)
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setSearch(value), 300);
  }, []);

  const fetchRecords = useCallback(
    async (pageNum: number, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: "20",
          sort,
          order: sort === "rating" ? "desc" : sort === "name" ? "asc" : "desc",
        });

        if (search) params.set("search", search);
        if (regionFilter) params.set("region", regionFilter);
        if (typeFilter) params.set("type", typeFilter);
        if (minRating) params.set("minRating", minRating);

        const response = await fetch(`/api/records?${params}`);
        const data = await response.json();

        if (response.ok) {
          if (append) {
            setRecords((prev) => [...prev, ...data.records]);
          } else {
            setRecords(data.records);
          }
          setHasMore(data.records.length === 20);
        }
      } catch (err) {
        console.error("Fetch records error:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, regionFilter, typeFilter, minRating, sort]
  );

  const fetchBookmarks = useCallback(async () => {
    setLoadingBookmarks(true);
    try {
      const res = await fetch("/api/timeline/bookmark");
      if (res.ok) {
        const data = await res.json();
        setBookmarks(data.bookmarks || []);
      }
    } catch (err) {
      console.error("Fetch bookmarks error:", err);
    } finally {
      setLoadingBookmarks(false);
    }
  }, []);

  const removeBookmark = async (postId: string) => {
    setBookmarks((prev) => prev.filter((b) => b.post_id !== postId));
    try {
      await fetch("/api/timeline/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, action: "unbookmark" }),
      });
    } catch {
      fetchBookmarks();
    }
  };

  useEffect(() => {
    if (collectionTab === "drank") {
      setPage(1);
      fetchRecords(1);
    } else {
      fetchBookmarks();
    }
  }, [collectionTab, fetchRecords, fetchBookmarks]);

  // Infinite scroll for "drank" tab
  useEffect(() => {
    if (collectionTab !== "drank") return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchRecords(nextPage, true);
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, page, fetchRecords, collectionTab]);

  const regions = [
    "スペイサイド", "アイラ", "ハイランド", "ローランド",
    "キャンベルタウン", "日本", "ケンタッキー", "テネシー",
    "アイルランド", "カナダ", "台湾", "インド",
  ];

  const types = [
    "シングルモルト", "ブレンデッド", "バーボン", "ライ",
    "ジャパニーズ", "アイリッシュ", "カナディアン",
  ];

  return (
    <div className="py-4 space-y-4 animate-fadeIn">
      {/* Tab Switcher */}
      <div className="flex glass-card overflow-hidden !rounded-xl">
        <button
          onClick={() => setCollectionTab("drank")}
          className={`flex-1 py-2.5 text-sm font-bold transition-all duration-300 relative flex items-center justify-center gap-1.5 ${
            collectionTab === "drank"
              ? "text-whiskey-gold bg-whiskey-gold/5"
              : "text-whiskey-muted hover:text-whiskey-text"
          }`}
        >
          <Wine size={14} />
          飲んだ
          {collectionTab === "drank" && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-whiskey-gold rounded-full tab-indicator" />
          )}
        </button>
        <button
          onClick={() => setCollectionTab("tsuginomu")}
          className={`flex-1 py-2.5 text-sm font-bold transition-all duration-300 relative flex items-center justify-center gap-1.5 ${
            collectionTab === "tsuginomu"
              ? "text-whiskey-gold bg-whiskey-gold/5"
              : "text-whiskey-muted hover:text-whiskey-text"
          }`}
        >
          <Bookmark size={14} />
          ツギノム
          {bookmarks.length > 0 && collectionTab !== "tsuginomu" && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold">
              {bookmarks.length}
            </span>
          )}
          {collectionTab === "tsuginomu" && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-whiskey-gold rounded-full tab-indicator" />
          )}
        </button>
      </div>

      {/* Drank Tab */}
      {collectionTab === "drank" && (
        <>
          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-whiskey-muted"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="名前・蒸留所で検索"
                className="w-full glass-input pl-9 pr-3 py-2.5 text-sm text-whiskey-text placeholder:text-whiskey-muted/50"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 rounded-xl border transition-all duration-300 active:scale-90 ${
                showFilters
                  ? "bg-whiskey-gold/10 border-whiskey-gold text-whiskey-gold"
                  : "glass-card !border-whiskey-border/50 text-whiskey-muted hover:text-whiskey-gold"
              }`}
              aria-label="フィルター"
            >
              <Filter size={18} />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="glass-card p-3 space-y-3 animate-slideDown">
              <div>
                <label className="block text-xs text-whiskey-muted mb-1">産地</label>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-full glass-input px-3 py-2 text-sm text-whiskey-text"
                >
                  <option value="">すべて</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-whiskey-muted mb-1">タイプ</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full glass-input px-3 py-2 text-sm text-whiskey-text"
                >
                  <option value="">すべて</option>
                  {types.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-whiskey-muted mb-1">最低評価</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full glass-input px-3 py-2 text-sm text-whiskey-text"
                >
                  <option value="">すべて</option>
                  <option value="8">8以上</option>
                  <option value="6">6以上</option>
                  <option value="4">4以上</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-whiskey-muted mb-1">並び替え</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full glass-input px-3 py-2 text-sm text-whiskey-text"
                >
                  <option value="created_at">日付順</option>
                  <option value="rating">評価順</option>
                  <option value="name">名前順</option>
                </select>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-3">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 shimmer rounded w-3/4" />
                      <div className="h-3 shimmer rounded w-1/2" />
                      <div className="h-3 shimmer rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && records.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-12 animate-fadeInScale">
              <div className="w-20 h-20 rounded-full glass-card flex items-center justify-center animate-float">
                <Camera size={32} className="text-whiskey-muted" />
              </div>
              <p className="text-whiskey-muted text-center text-sm">まだ記録がありません</p>
              <Link href="/record" className="glass-button text-white font-bold px-6 py-2.5 text-sm">
                最初の一杯を記録する
              </Link>
            </div>
          )}

          {/* Records List */}
          {!loading && records.length > 0 && (
            <div className="space-y-3 stagger-children">
              {records.map((record) => (
                <Link
                  key={record.id}
                  href={`/collection/${record.id}`}
                  className="block glass-card p-3 active:scale-[0.98] transition-transform duration-200"
                >
                  <div className="flex gap-3">
                    {record.photo_url ? (
                      <Image
                        src={record.photo_url}
                        alt={record.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-whiskey-border/30 flex-shrink-0 flex items-center justify-center text-whiskey-muted text-xs">
                        No Photo
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-whiskey-text truncate">
                        {record.name}
                      </h3>
                      <p className="text-xs text-whiskey-muted truncate">
                        {[record.region, record.type].filter(Boolean).join(" / ")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-whiskey-gold font-bold text-sm">
                          {record.rating}/10
                        </span>
                        <span className="text-whiskey-muted text-xs">
                          {new Date(record.created_at).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {hasMore && (
                <div ref={loadMoreRef} className="py-4 flex justify-center">
                  {loadingMore && (
                    <Loader2 size={24} className="animate-spin text-whiskey-gold" />
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Tsuginomu Tab */}
      {collectionTab === "tsuginomu" && (
        <>
          {loadingBookmarks && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-3">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 shimmer rounded w-3/4" />
                      <div className="h-3 shimmer rounded w-1/2" />
                      <div className="h-3 shimmer rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingBookmarks && bookmarks.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-12 animate-fadeInScale">
              <div className="w-20 h-20 rounded-full glass-card flex items-center justify-center animate-float">
                <Bookmark size={32} className="text-whiskey-muted" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-whiskey-muted text-sm">ツギノムリストは空です</p>
                <p className="text-whiskey-muted/70 text-xs">
                  みんなのウイ活で気になるウイスキーを
                  <br />
                  「ツギノム」して保存しましょう
                </p>
              </div>
              <Link
                href="/timeline"
                className="glass-button text-white font-bold px-6 py-2.5 text-sm"
              >
                みんなのウイ活を見る
              </Link>
            </div>
          )}

          {!loadingBookmarks && bookmarks.length > 0 && (
            <div className="space-y-3 stagger-children">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="glass-card p-3"
                >
                  <div className="flex gap-3">
                    {bookmark.whiskey_photo_url ? (
                      <Image
                        src={bookmark.whiskey_photo_url}
                        alt={bookmark.whiskey_name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-whiskey-border/30 flex-shrink-0 flex items-center justify-center text-whiskey-muted text-xs">
                        No Photo
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-whiskey-text truncate">
                        {bookmark.whiskey_name}
                      </h3>
                      <p className="text-xs text-whiskey-muted truncate">
                        {[bookmark.whiskey_region, bookmark.whiskey_type]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {bookmark.whiskey_rating && (
                          <span className="text-whiskey-gold font-bold text-sm">
                            {bookmark.whiskey_rating}/10
                          </span>
                        )}
                        <span className="text-whiskey-muted text-xs">
                          {new Date(bookmark.created_at).toLocaleDateString("ja-JP")} に保存
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBookmark(bookmark.post_id)}
                      className="flex-shrink-0 text-whiskey-muted hover:text-red-400 transition-colors active:scale-90 self-center"
                      aria-label="削除"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {bookmark.whiskey_flavor_tags && bookmark.whiskey_flavor_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {bookmark.whiskey_flavor_tags.map((tag) => (
                        <span
                          key={tag}
                          className="glass-tag px-2 py-0.5 text-whiskey-gold text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

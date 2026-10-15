export interface DramaItem {
  id: string;
  playletId?: string;
  title: string;
  slug: string;
  cover: string;
  episodes: number;
  totalEpisodes: number;
  synopsis: string;
  tags: string[];
  source: 'flickreels' | 'melolo';
  rating?: string;
  url?: string;
}

export const FALLBACK_CAROUSEL: DramaItem[] = [
  {
    id: 'flick-1001',
    playletId: '1001',
    title: 'Pewaris Takhta Tersembunyi Sang Milyarder',
    slug: 'pewaris-takhta-tersembunyi-sang-milyarder',
    cover: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    episodes: 88,
    totalEpisodes: 88,
    synopsis:
      'Selama 3 tahun ia dihina sebagai menantu miskin yang menumpang hidup. Saat kakeknya yang merupakan konglomerat terkaya di Asia menghubunginya, identitas aslinya terungkap dan ia mulai membalas semua penghinaan.',
    tags: ['CEO', 'Milyarder', 'Balas Dendam', 'Menantu Terbuang'],
    source: 'flickreels',
    rating: '9.8'
  },
  {
    id: 'flick-1002',
    playletId: '1002',
    title: 'Ratu Mafia Kembali: Pembalasan Dendam Manis',
    slug: 'ratu-mafia-kembali-pembalasan-dendam-manis',
    cover: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    episodes: 76,
    totalEpisodes: 76,
    synopsis:
      'Dikhianati oleh tunangan dan saudara tirinya hingga dilempar ke laut, ia kembali 5 tahun kemudian sebagai pemimpin sindikat elit nomor satu untuk merebut kembali tahta dan hak warisnya.',
    tags: ['Mafia', 'Wanita Kuat', 'Revenge', 'Aksi'],
    source: 'flickreels',
    rating: '9.7'
  },
  {
    id: 'flick-1003',
    playletId: '1003',
    title: 'Cinta Terlarang Sang Presdir Dingin',
    slug: 'cinta-terlarang-sang-presdir-dingin',
    cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    episodes: 92,
    totalEpisodes: 92,
    synopsis:
      'Pernikahan kontrak selama 100 hari yang seharusnya tanpa perasaan berubah saat rahasia masa lalu terbongkar. Bisakah sang Presdir menaklukkan hati wanita yang tak pernah tunduk padanya?',
    tags: ['Romantis', 'Pernikahan Kontrak', 'Presdir', 'Drama'],
    source: 'flickreels',
    rating: '9.6'
  }
];

export const FALLBACK_HOT: DramaItem[] = [
  {
    id: 'flick-1004',
    playletId: '1004',
    title: 'Reinkarnasi Sang Kaisar Naga di Kota Modern',
    slug: 'reinkarnasi-sang-kaisar-naga-di-kota-modern',
    cover: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
    episodes: 100,
    totalEpisodes: 100,
    synopsis:
      'Dewa Perang yang terlahir kembali dalam tubuh pemuda lemah di dunia modern. Dengan kemampuan bela diri tak tertandingi dan pengetahuan medis magis, ia menguasai dunia bawah tanah.',
    tags: ['Fantasi', 'Dewa Perang', 'Kekuatan Gaib', 'Reinkarnasi'],
    source: 'flickreels',
    rating: '9.9'
  },
  {
    id: 'flick-1005',
    playletId: '1005',
    title: 'Putri Konglomerat yang Tertukar',
    slug: 'putri-konglomerat-yang-tertukar',
    cover: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
    episodes: 65,
    totalEpisodes: 65,
    synopsis:
      'Sejak bayi ditukar dan dibesarkan di pedesaan miskin, gadis jenius ini kembali ke keluarga aslinya namun diperlakukan dingin demi anak angkat. Saat kejeniusannya diakui dunia, keluarga kandungnya memohon ampun.',
    tags: ['Keluarga', 'Balas Dendam', 'Gadis Jenius', 'Drama Emosional'],
    source: 'flickreels',
    rating: '9.5'
  },
  {
    id: 'melolo-1006',
    slug: 'ikatan-takdir-sang-alpha-dan-luna',
    title: 'Ikatan Takdir Sang Alpha dan Luna',
    cover: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
    episodes: 80,
    totalEpisodes: 80,
    synopsis:
      'Ditolak oleh Alpha terkuat karena dianggap manusia biasa tanpa serigala, tak ada yang tahu bahwa di dalam tubuhnya tertidur darah Ratu Serigala Perak yang legendaris.',
    tags: ['Werewolf', 'Alpha', 'Fantasi', 'Romantis'],
    source: 'melolo',
    rating: '9.7'
  },
  {
    id: 'melolo-1007',
    slug: 'rahasia-miliarder-penyamaran-sempurna',
    title: 'Rahasia Sang Miliarder: Penyamaran Sempurna',
    cover: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    episodes: 70,
    totalEpisodes: 70,
    synopsis:
      'Menyamar sebagai supir taksi untuk mencari wanita yang menyelamatkan nyawanya 10 tahun lalu. Tak disangka ia malah dijodohkan dengan CEO wanita cantik yang sombong.',
    tags: ['Billionaire', 'Penyamaran', 'Romansa Komedi', 'CEO'],
    source: 'melolo',
    rating: '9.4'
  }
];

export const FALLBACK_RANKINGS: DramaItem[] = [
  {
    id: 'flick-1008',
    playletId: '1008',
    title: 'Takdir Dua Dunia: Cinta Lintas Dimensi',
    slug: 'takdir-dua-dunia-cinta-lintas-dimensi',
    cover: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
    episodes: 85,
    totalEpisodes: 85,
    synopsis:
      'Seorang dokter bedah modern terlempar ke era dinasti kuno dan menyelamatkan pangeran yang diracuni. Pertarungan tahta dan cinta abadi menguji kesetiaan mereka.',
    tags: ['Time Travel', 'Kerajaan', 'Dokter Sakti', 'Romansa'],
    source: 'flickreels',
    rating: '9.9'
  },
  {
    id: 'melolo-1009',
    slug: 'bos-mafia-yang-terjebak-cinta',
    title: 'Bos Mafia yang Terjebak Cinta Ibu Tunggal',
    cover: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=800&q=80',
    episodes: 60,
    totalEpisodes: 60,
    synopsis:
      'Anak kembar jenius menjebak bos mafia paling ditakuti untuk menjadi ayah mereka. Siapa sangka sang pembunuh berdarah dingin berubah jadi pelindung setia keluarga kecil itu.',
    tags: ['Mafia', 'Anak Kembar Jenius', 'Family', 'Manis'],
    source: 'melolo',
    rating: '9.8'
  },
  {
    id: 'flick-1010',
    playletId: '1010',
    title: 'Kutukan Pengantin Serigala Malam',
    slug: 'kutukan-pengantin-serigala-malam',
    cover: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80',
    episodes: 72,
    totalEpisodes: 72,
    synopsis:
      'Dijual oleh keluarganya untuk menjadi pengantin Tumbal bagi Lord Lycan yang dikutuk. Saat kutukan itu patah berkat ketulusannya, kekuatan sejati mereka mengguncang 7 klan.',
    tags: ['Werewolf', 'Kutukan', 'Fantasi', 'Romantis'],
    source: 'flickreels',
    rating: '9.6'
  }
];

// Placeholder catalog is intentionally offline: no sample stream URLs are bundled.
// Playing an unrelated public demo video under a real drama title is worse than
// reporting the episode as unavailable, so streamUrl stays null here.
export const SAMPLE_STREAM_URLS: string[] = [];

export function getFallbackDetail(idOrSlug: string, source: 'flickreels' | 'melolo' = 'flickreels') {
  const all = [...FALLBACK_CAROUSEL, ...FALLBACK_HOT, ...FALLBACK_RANKINGS];
  const drama =
    all.find((d) => d.id === idOrSlug || d.slug === idOrSlug || d.playletId === idOrSlug) ||
    all[0];

  const totalEpisodes = drama.totalEpisodes || 60;
  const episodes = [];

  for (let i = 1; i <= totalEpisodes; i++) {
    const isLocked = i > 15;
    const streamUrl = SAMPLE_STREAM_URLS.length
      ? SAMPLE_STREAM_URLS[(i - 1) % SAMPLE_STREAM_URLS.length]
      : null;

    episodes.push({
      index: i,
      episodeNumber: i,
      episodeId: i,
      chapterId: `${drama.id}_${i}`,
      title: `${drama.title} - Episode ${i}`,
      cover: drama.cover,
      durationSec: 65,
      formattedDuration: '01:05',
      isLocked,
      url: streamUrl,
      hasStream: !isLocked
    });
  }

  return {
    id: drama.id,
    playletId: drama.playletId || drama.id,
    title: drama.title,
    slug: drama.slug,
    locale: 'id',
    source: drama.source,
    cover: drama.cover,
    synopsis: drama.synopsis,
    totalEpisodes,
    episodesCount: totalEpisodes,
    startPayNum: 16,
    freeEpisodesCount: 15,
    screenType: 1,
    videoOrientation: 'Vertical (9:16)',
    finishState: 2,
    completionStatus: 'Tamat (Completed)',
    uploadDate: '2026-09-15',
    tags: drama.tags,
    rating: drama.rating || '9.8',
    episodes
  };
}

export function getFallbackStream(idOrSlug: string, epNum: number = 1) {
  const all = [...FALLBACK_CAROUSEL, ...FALLBACK_HOT, ...FALLBACK_RANKINGS];
  const drama =
    all.find((d) => d.id === idOrSlug || d.slug === idOrSlug || d.playletId === idOrSlug) ||
    all[0];

  const isLocked = epNum > 15;
  const streamUrl = SAMPLE_STREAM_URLS.length
    ? SAMPLE_STREAM_URLS[(epNum - 1) % SAMPLE_STREAM_URLS.length]
    : null;

  return {
    dramaId: drama.id,
    dramaTitle: drama.title,
    episodeNumber: epNum,
    chapterTitle: `${drama.title} - Episode ${epNum}`,
    streamUrl,
    hlsUrl: streamUrl && streamUrl.endsWith('.m3u8') ? streamUrl : null,
    videoUrl: streamUrl,
    thumbnail: drama.cover,
    cover: drama.cover,
    durationSec: 65,
    formattedDuration: '01:05',
    videoFormat: streamUrl?.endsWith('.m3u8') ? 'HLS Stream (.m3u8)' : 'MP4 Video',
    videoOrientation: 'Vertical (9:16)',
    isLocked,
    source: drama.source
  };
}

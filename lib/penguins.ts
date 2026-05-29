const BASE = "https://ipfs.io/ipfs/QmNf1UsmdGaMbpatQ6toXSkzDpizaGmC9zfunCyoz1enD5/penguin";

// Curated selection of Pudgy Penguins with diverse traits
export const PUDGY_AVATARS = [
  1, 13, 41, 86, 153, 245,
  400, 532, 764, 893, 1024, 1337,
  1500, 1776, 2000, 2115, 2458, 2894,
  3000, 3224, 3500, 4000, 4115, 4500,
  5000, 5555, 6000, 6666, 7000, 7777,
  8000, 8456,
].map((id) => ({
  id,
  url: `${BASE}/${id}.png`,
  label: `Pudgy #${id}`,
}));

// Register guild commands once with Node.js >= 20.
// Required variables must be set locally, not committed.
const id = process.env.DISCORD_APPLICATION_ID;
const guild = process.env.DISCORD_GUILD_ID;
const token = process.env.DISCORD_BOT_TOKEN;
if (!id || !guild || !token) {
  console.error("Missing DISCORD_APPLICATION_ID, DISCORD_GUILD_ID or DISCORD_BOT_TOKEN");
  process.exit(1);
}
const code = () => ({ type: 3, name: "kode", description: "Kode tiket NML-...", required: true });
const commands = [
  { name: "bug", description: "Laporkan masalah NADMO LIVE melalui formulir", type: 1 },
  { name: "cekbug", description: "Cek status laporan bug milikmu", type: 1, options: [code()] },
  { name: "setbug", description: "Admin: ubah status laporan bug", type: 1,
    default_member_permissions: "32",
    options: [code(), { type: 3, name: "status", description: "Status baru", required: true,
      choices: [
        { name: "Baru", value: "open" },
        { name: "Investigasi", value: "investigating" },
        { name: "Diperbaiki", value: "fixing" },
        { name: "Selesai", value: "resolved" },
        { name: "Ditutup", value: "closed" }
      ] }]
  }
];
const response = await fetch(
  "https://discord.com/api/v10/applications/" + id + "/guilds/" + guild + "/commands",
  { method: "PUT", headers: { authorization: "Bot " + token, "content-type": "application/json" },
    body: JSON.stringify(commands) }
);
if (!response.ok) {
  console.error("Discord command registration failed: HTTP " + response.status);
  process.exit(1);
}
const registered = await response.json();
console.log("Registered commands: " + registered.map(x => "/" + x.name).join(", "));

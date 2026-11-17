<?php
// Upozornenie na nový dopyt z webu: pošle ho e-mailom na adresu projektu.
//
// Skript volá databáza projektu hneď po uložení dopytu (supabase/schema.sql, funkcia
// inquiries_notify). Požiadavka je podpísaná kľúčom, ktorý pozná len databáza a tento
// hosting – nikto iný cez skript e-mail neodošle a príjemcu nemožno zmeniť zvonka.
//
// Kľúč ani adresa príjemcu nie sú v repozitári. Sú v súbore jh-notify.config.php, ktorý
// leží o priečinok vyššie než web (mimo dosahu prehliadača); vzor je v README, časť
// „E-mail o novom dopyte“. Bez neho skript odpovie, že nie je nastavený.

// Píše sa tak, aby bežal na PHP 7.2 aj novšom – verziu určuje hosting.

declare(strict_types=1);

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function done(int $status, string $state): void
{
    http_response_code($status);
    echo json_encode(['ok' => $status === 200, 'state' => $state]);
    exit;
}

/** Jednoriadkový text bez riadiacich znakov, skrátený na daný počet znakov. */
function line($value, int $max): string
{
    $text = is_scalar($value) ? (string) $value : '';
    $text = trim(preg_replace('/[\p{C}\s]+/u', ' ', $text) ?? '');
    return preg_match('/^.{0,' . $max . '}/us', $text, $m) ? $m[0] : '';
}

/** Hlavička s diakritikou (RFC 2047), po častiach, aby žiadne slovo nebolo pridlhé. */
function encoded(string $text): string
{
    if (!preg_match('/[^\x20-\x7E]/', $text)) {
        return $text;
    }
    $words = [];
    foreach (preg_split('/(.{1,14})/us', $text, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) ?: [] as $part) {
        $words[] = '=?UTF-8?B?' . base64_encode($part) . '?=';
    }
    return implode(' ', $words);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    done(405, 'method');
}

// Nastavenie: najprv mimo webu, potom (ak hosting von nepustí) skrytý súbor vo webe.
$config = null;
foreach ([dirname(__DIR__) . '/jh-notify.config.php', __DIR__ . '/.jh-notify.config.php'] as $file) {
    if (@is_file($file)) {
        $config = require $file;
        break;
    }
}
$secret = is_array($config) ? (string) ($config['secret'] ?? '') : '';
$to = is_array($config) ? (string) ($config['to'] ?? '') : '';
if (strlen($secret) < 32 || filter_var($to, FILTER_VALIDATE_EMAIL) === false) {
    done(503, 'not_configured');
}
$from = filter_var($config['from'] ?? '', FILTER_VALIDATE_EMAIL) ?: $to;

$body = file_get_contents('php://input', false, null, 0, 20001);
if ($body === false || $body === '' || strlen($body) > 20000) {
    done(400, 'body');
}

// Podpis: HMAC-SHA256 z „čas.telo“. Staršie než 10 minút neprijmeme.
$time = (string) ($_SERVER['HTTP_X_JH_TIMESTAMP'] ?? '');
$sign = strtolower((string) ($_SERVER['HTTP_X_JH_SIGNATURE'] ?? ''));
if (!preg_match('/^\d{9,11}$/', $time) || abs(time() - (int) $time) > 600) {
    done(403, 'time');
}
if (!preg_match('/^[0-9a-f]{64}$/', $sign) || !hash_equals(hash_hmac('sha256', $time . '.' . $body, $secret), $sign)) {
    done(403, 'signature');
}

$data = json_decode($body, true);
if (!is_array($data)) {
    done(400, 'json');
}

$name = line($data['name'] ?? '', 120);
$email = line($data['email'] ?? '', 200);
$phone = line($data['phone'] ?? '', 40);
$interest = line($data['interest'] ?? '', 80);
$lang = is_string($data['lang'] ?? null) && preg_match('/^[a-z]{2}$/', $data['lang']) ? $data['lang'] : 'sk';
$message = str_replace(["\r\n", "\r"], "\n", is_scalar($data['message'] ?? null) ? (string) $data['message'] : '');
$message = trim(preg_replace('/[^\P{C}\n\t]+/u', '', $message) ?? '');
$message = preg_match('/^.{0,2000}/us', $message, $m) ? $m[0] : '';
if ($name === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    done(400, 'fields');
}

$languages = ['sk' => 'slovenčina', 'en' => 'angličtina', 'hr' => 'chorvátčina', 'de' => 'nemčina', 'hu' => 'maďarčina'];
$received = '';
try {
    $received = (new DateTimeImmutable(line($data['created_at'] ?? '', 40) ?: 'now'))
        ->setTimezone(new DateTimeZone('Europe/Bratislava'))
        ->format('j. n. Y H:i');
} catch (Throwable $e) {
    $received = date('j. n. Y H:i');
}
$site = rtrim((string) ($config['site'] ?? ''), '/');
if (!preg_match('~^https://[A-Za-z0-9.-]+(/[A-Za-z0-9._/-]*)?$~', $site)) {
    $site = 'https://' . preg_replace('/[^A-Za-z0-9.-]/', '', (string) ($_SERVER['HTTP_HOST'] ?? ''));
}

$text = implode("\n", [
    'Nový dopyt z webu Jadran Hills',
    '',
    'Meno:     ' . $name,
    'E-mail:   ' . $email,
    'Telefón:  ' . ($phone !== '' ? $phone : 'neuvedený'),
    'Záujem:   ' . ($interest !== '' ? $interest : 'neuvedený'),
    'Jazyk:    ' . ($languages[$lang] ?? $lang) . ($lang === 'sk' ? '' : ' (stránka /' . $lang . '/)'),
    'Prijaté:  ' . $received,
    '',
    'Správa:',
    $message !== '' ? $message : '(bez správy)',
    '',
    '--',
    'Odpoveď na tento e-mail pôjde priamo záujemcovi.',
    'Dopyt je uložený aj v CRM: ' . $site . '/crm/ (časť Dopyty z webu).',
    '',
]);

$subject = encoded('Nový dopyt z webu: ' . line($name, 60) . ($interest !== '' ? ' – ' . $interest : ''));
$headers = implode("\r\n", [
    'From: Jadran Hills web <' . $from . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    'Auto-Submitted: auto-generated',
    'X-Auto-Response-Suppress: All',
]);
$content = rtrim(chunk_split(base64_encode($text), 76, "\r\n"));

// Niektoré hostingy nedovolia nastaviť odosielateľa obálky – vtedy to skúsime bez neho.
$sent = @mail($to, $subject, $content, $headers, '-f' . $from) || @mail($to, $subject, $content, $headers);
done($sent ? 200 : 502, $sent ? 'sent' : 'mail_failed');

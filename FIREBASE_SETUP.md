# セットアップ手順

このサイトを動かすために必要な、Firebase と EmailJS の設定手順です。

## 1. Firebase プロジェクトの設定値を取得する

1. [Firebase Console](https://console.firebase.google.com/project/teamoyaji-motohachioji/overview) を開く
2. 左上の歯車アイコン →「プロジェクトの設定」→「全般」タブ
3. 下の方の「マイアプリ」に Web アプリ（`</>` アイコン）がなければ「アプリを追加」で Web アプリを1つ追加する
4. 表示される `firebaseConfig` オブジェクトの値をコピーし、[assets/js/firebase-config.js](assets/js/firebase-config.js) の `YOUR_...` の部分をすべて置き換える

## 2. Firebase Authentication（Google ログイン）を有効化する

1. Firebase Console 左メニュー →「Authentication」→「Sign-in method」タブ
2. 「Google」を選択して有効化し、プロジェクトのサポートメールを設定して保存
3. 「Settings」タブ →「承認済みドメイン」に以下を追加
   - ローカルテスト用: `localhost`
   - 本番公開用: `oyaji-motohigashihachioji.github.io`

## 3. Cloud Firestore を有効化し、セキュリティルールを設定する

1. Firebase Console 左メニュー →「Firestore Database」→「データベースの作成」（本番モードでOK、リージョンは `asia-northeast1` 推奨）
2. 作成後、「ルール」タブを開き、このリポジトリの [firestore.rules](firestore.rules) の中身を丸ごと貼り付けて「公開」をクリック

### 最初の管理者アカウントを作る

1. サイトの `login.html` から一度 Google ログインする（この時点では「承認待ち」の一般会員として登録される）
2. Firebase Console →「Firestore Database」→「データ」タブ →`users` コレクション → 自分の uid のドキュメントを開く
3. フィールドを手動で編集: `role` を `"admin"`、`status` を `"approved"` に変更
4. サイトに戻って再読み込みすると、ヘッダーに「管理」リンクが表示され `admin.html` にアクセスできるようになる（以降の会員承認・役職設定は管理者ページから行える）

### 複合インデックスについて

初回利用時、ブラウザのコンソールに
`The query requires an index...` というエラーと Firestore Console への直接リンクが表示されることがあります（`blogPosts`・`users` の絞り込み+並び替えクエリで発生）。
表示されたリンクをクリックして「インデックスを作成」を押せば数分で解消します。

## 4. 画像の運用方法（Googleドライブ）

1. 写真は [Googleドライブの共有フォルダ](https://drive.google.com/drive/folders/1bBISzop7CiJjm3lglWox-vgEF4IG9FfG) にアップロードする
2. アップロードした画像を右クリック →「共有」→ 一般アクセスを「リンクを知っている全員」に変更してリンクをコピー
3. 管理者ページ（活動記録投稿）またはブログ投稿フォームの画像URL欄にそのまま貼り付ける
   - 例: `https://drive.google.com/file/d/XXXXXXXXXXXXX/view?usp=sharing`
   - サイト側で自動的に `https://lh3.googleusercontent.com/d/XXXXXXXXXXXXX` 形式の直リンクに変換して保存する

## 5. EmailJS（お問い合わせフォーム）の設定

1. [EmailJS](https://www.emailjs.com/) で無料アカウントを作成
2. 「Email Services」→ 送信元にしたいメールサービス（Gmail等）を追加し、`oyaji.motohigashihachioji@gmail.com` を受信先として設定 → **Service ID** をメモ
3. 「Email Templates」→ 新規テンプレートを作成し、本文に `{{from_name}}` `{{from_email}}` `{{message}}` の変数を使う → **Template ID** をメモ
4. 「Account」→「General」の **Public Key** をメモ
5. [assets/js/emailjs-config.js](assets/js/emailjs-config.js) の `YOUR_EMAILJS_PUBLIC_KEY` / `YOUR_EMAILJS_SERVICE_ID` / `YOUR_EMAILJS_TEMPLATE_ID` を実際の値に置き換える

## 6. GitHub Pages で公開する

1. GitHub リポジトリの Settings →「Pages」→ Source を `main` ブランチ / `/ (root)` に設定
2. `https://oyaji-motohigashihachioji.github.io/` で公開される

## 各設定ファイル一覧

| ファイル | 内容 |
|---|---|
| `assets/js/firebase-config.js` | Firebase プロジェクト設定 |
| `assets/js/emailjs-config.js` | EmailJS 設定 |
| `firestore.rules` | Firestore セキュリティルール（Console に貼り付けて使用） |

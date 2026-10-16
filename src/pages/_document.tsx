import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

import { ACADEMY_THEME_INIT_SCRIPT } from '@/tilawa/academyTheme';
import { getDir } from '@/utils/locale';

const DEFAULT_LOCALE = 'en';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps, locale: ctx?.locale || DEFAULT_LOCALE };
  }

  render = () => (
    <Html dir={getDir(this.props.locale)} lang={this.props.locale}>
      <Head>
        <script
          id="tilawa-theme-init"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: ACADEMY_THEME_INIT_SCRIPT }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

export default MyDocument;

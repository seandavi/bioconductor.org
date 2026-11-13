import os
import tempfile
import unittest

from pipeline.content import compact_html, resolve_erb


class CompactHtml(unittest.TestCase):
    def test_blank_lines_removed(self):
        self.assertEqual(compact_html("<div>\n\n    <input/>\n  \n</div>\n"), "<div>\n    <input/>\n</div>\n")

    def test_pre_kept_verbatim(self):
        src = "<div>\n\n<pre>a\n\n    b</pre>\n\n</div>"
        self.assertEqual(compact_html(src), "<div>\n<pre>a\n\n    b</pre>\n</div>")

    def test_textarea_kept_verbatim(self):
        self.assertIn("x\n\ny", compact_html("<textarea>x\n\ny</textarea>\n\n<p/>"))


class RenderPartial(unittest.TestCase):
    def test_about_join_shape(self):
        # /about/ (issue #47): an indented render() inside a <div>, whose partial
        # has a blank line followed by 4-space-indented markup.
        with tempfile.TemporaryDirectory() as repo:
            os.makedirs(os.path.join(repo, "layouts", "components"))
            with open(os.path.join(repo, "layouts", "components", "join.html"), "w") as fh:
                fh.write('<section>\n  <div>\n\n    <input type="radio"/>\n  </div>\n</section>\n')
            body = "<div class=\"about-join\">\n  <%= render('/components/join/') %>\n</div>\n"
            out = resolve_erb(body, repo, {})
            block = out.split("</div>\n")[0]
            self.assertNotIn("\n\n", out.split('<div class="about-join">')[1].split("</section>")[0])
            self.assertIn('<input type="radio"/>', block)


if __name__ == "__main__":
    unittest.main()


class WritePages(unittest.TestCase):
    def test_frontmatter_body_and_hero(self):
        from pipeline.content import write_pages
        page = {"url": "/install/", "source": "install.html", "title": "Install", "body": "<p>x</p>\n",
                "meta": {"fullwidth": True}, "hero": {"name": "components/install_hero", "html": "<h1>h</h1>"},
                "erbUnresolved": [], "format": "html", "fullwidth": True}
        todo = dict(page, source="help/todo.md", hero=None, meta={}, erbUnresolved=["<%= x %>"], body="b")
        with tempfile.TemporaryDirectory() as d:
            write_pages([page, todo], d)
            with open(os.path.join(d, "install.html")) as fh:
                self.assertEqual(fh.read(), "---\ntitle: Install\nfullwidth: true\nhero: components/install_hero\n---\n<p>x</p>\n")
            with open(os.path.join(d, "_partials", "components", "install_hero.html")) as fh:
                self.assertEqual(fh.read(), "<h1>h</h1>")
            with open(os.path.join(d, "help", "todo.md")) as fh:
                self.assertIn("erb_unresolved:\n- <%= x %>\n", fh.read())

const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function getDom(url) {
  const API_KEY =process.env.SCRAPER_API_KEY; // Replace with your actual API key
  return axios("http://api.scraperapi.com/", {
    params: {
      url: url,
      api_key: API_KEY,
      render: true
    }
  }).then((res) => {
    const dom = new JSDOM(res.data);
    return dom.window.document;
  });
}

const getAc = async (url) => {
  try {
    const dom = await getDom(url);
    let standing = dom.querySelector('.standings');
    let problemsA = standing.rows[0].querySelectorAll('a');

    let problems = [];
    for (let problem of problemsA) {
      problems.push({
        name: problem.title,
        link: "https://codeforces.com" + problem.href
      });
    }

    let sheetNameA = dom.querySelector(".contest-name").querySelector('a');
    let contest = {
      name: sheetNameA.textContent.trim(),
      link: "https://codeforces.com" + sheetNameA.href,
      problems: problems
    };

    let data = {};
    for (let i = 1; i < standing.rows.length - 1; i++) {
      let team = "Not a team", contestants = [];
      let tr = standing.rows[i].querySelectorAll('td'), isTeam = true;
      try {
        trA = tr[1].querySelector('span').querySelectorAll('a');
        if (!trA.length) isTeam = false;
      } catch {
        isTeam = false;
      }

      if (isTeam && trA[0].href.includes('team')) {
        team = trA[0]["title"];
        for (let k = 1; k < trA.length; k++) {
          contestants.push(trA[k].title.split(" ").pop());
        }
      } else {
        contestants.push(tr[1].querySelector("a").title.split(" ").pop());
      }

      let tds = standing.rows[i].querySelectorAll('td');
      for (let i = 4; i < tds.length; i++) {
        let txt = tds[i].querySelector("span").textContent.trim() || "-";
        if (txt[0] == '-') continue;
        for (let contestant of contestants) {
          if (!data[contestant]) {
            data[contestant] = [];
          }
          let pNum = problems[i - 4].name.split(" - ")[0];
          if (!data[contestant].includes(pNum)) data[contestant].push(pNum);
        }
      }
    }

    return {
      status: "OK",
      result: {
        contest: contest,
        contestants: data
      }
    };
  } catch (err) {
    return {
      status: "FAILED",
      result: "There is something wrong :(",
      err: err.message
    };
  }
};

module.exports = async function (context, req) {
  const { groupId, contestId, page, listId } = req.params;
  const url = listId
    ? `https://codeforces.com/group/${groupId}/contest/${contestId}/standings/page/${page}?list=${listId}&showUnofficial=true`
    : `https://codeforces.com/group/${groupId}/contest/${contestId}/standings/page/${page}?showUnofficial=true`;

  const data = await getAc(url);
  context.res = {
    status: 200,
    body: data
  };
};

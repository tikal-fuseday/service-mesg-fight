const axios = require('axios');
const {getClusters, applyDeployment} = require("./kube");
const clusters = require('../../clusters');

module.exports = function (app) {

	app.get("/api/clusters", async function (req, res) {
		const clusters = await getClusters();
		res.status(200).json(clusters);
	});

	app.get("/api/clusters/:clusterName", async function (req, res) {
		const cluster = clusters[req.params.clusterName];
		if (!cluster) {
			res.status(401).json({message: 'cluster does not exist'});
			return;
		}
		res.status(200).json(cluster);
	});

	app.post("/api/apply", async function (req, res) {
		const body = req.body || {};
		if (!(body.clusterName && body.namespace && body.deploymentFilePath)) {
			res.status(401).json({message: 'missing arguments'});
			return;
		}
		await applyDeployment(body.clusterName, body.namespace, body.deploymentFilePath);
		res.status(200).json({status: 'success'});
	});

	app.post("/api/bomb/:clusterName", async function (req, res) {
		const cluster = clusters[req.params.clusterName];
		const url = req.body.url;
		if (!cluster) {
			res.status(401).json({message: 'cluster does not exist'});
			return;
		}
		if (!url) {
			res.status(401).json({message: 'please provide a url to test'});
			return;
		}

		const timeInSeconds = 60 * 60;
		const concurrentThreads = req.body.parallels || 100;

		axios.post(
			`${cluster.bombServiceUrl}/api/v1/bomb/${timeInSeconds}/${concurrentThreads}`,
			null,
			{params: {url}}
		)
			.then(({data}) => {
				// should be {bombId: number}
				res.status(200).json(data);
			})
			.catch(err => {
				console.log(err);
				res.status(500).json({message: err.message});
			})
	});

	app.get("/api/bomb/:clusterName/:bombId/status", async function (req, res) {
		const cluster = clusters[req.params.clusterName];
		if (!cluster) {
			res.status(401).json({message: 'cluster does not exist'});
			return;
		}

		axios.get(`${cluster.bombServiceUrl}/api/v1/bomb/${req.params.bombId}/status`)
			.then(({data}) => {
				// should be:
				// {status: 'running' | 'done', completed: Number(between 0 to 1)}
				res.status(200).json(data);
			})
			.catch(err => {
				console.log(err);
				res.status(500).json({message: err.message});
			})
	});

};
